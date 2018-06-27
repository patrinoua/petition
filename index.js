const db = require("./database/database");
const express = require("express");

// const session = require('express-session'),
// const Store = require('connect-redis')(session);

const app = express();
const bodyParser = require("body-parser");
const hb = require("express-handlebars");
const fs = require("fs");
const cookieSession = require("cookie-session");
const hashPassword = require("./config/hashPassword").hashPassword;
const csurf = require('csurf');

var loggedIn = 0;
let mySecret;

if(!process.env.DATABASE_URL){
    mySecret = require('./config/secrets.json').mySecret;
}else{
    mySecret = process.env.MY_SECRET;
}
app.use(cookieSession({
        secret: mySecret,
        maxAge: 1000 * 60 * 60 * 24 * 14 //2 weeks
        // maxAge: 10*60000 //1 minute
    })
);

app.get("/test", function(req, res) {
    req.session.test = "This works!!!";
    req.session.chicken = "funky";
});

app.engine("handlebars", hb());
app.set("view engine", "handlebars");
app.use(express.static(__dirname + "/public"));

app.use(bodyParser.urlencoded({
        extended: false
    })
);

app.use(csurf());

app.use(function(req, res, next) {
    res.setHeader("X-Frame-Options","DENY")
    res.locals.csrfToken = req.csrfToken();
    next();
});

app.use(function(req, res, next) {
    if (
        !req.session.user &&
        req.url != "/register" &&
        req.url != "/login" &&
        req.url != "/"
    ) {
        res.redirect("/");
    } else {
        next();
    }

});
app.get("/", function(req, res) {
    res.render("welcome", {
        layout: "form_layout"
    });
});
app.get("/petition", function(req, res) {
    res.render("petition_input", {
        layout: "form_layout"
    });
});

app.post("/petition", function(req, res) {
    if (req.body.sig) {
        db.saveSignature(req.session.user.id, req.body.sig)
        .then(hasSigned=>{
            req.session.user.hasSigned = true;
                res.redirect("/thank_you");
        })
        .catch(function(err) {
            console.log(err);
        });
    } else {
        res.render("petition_input", {
            err: "Please sign the form",
            layout: "form_layout"
        });
    }
});

app.get("/thank_you", function(req, res) {
    db.getSignature(req.session.user.id).then(theSig => {
        res.render("thank_you", {
            sig: theSig.rows[0].signature,
            layout: "form_layout"
        });
    }).catch(err=>{
        console.log("no signature");
        res.redirect("/petition");
    });
});

app.post("/thank_you",function(req,res){
    db.deleteSignature(req.session.user.id)
       .then(signatureDeleted=>{
           req.session.user.hasSigned=false;
           res.redirect("/petition");
       }).catch(err=>{console.log("There was a problem with deleting signature...:",err);})
});

app.get("/profile",function(req,res){
    res.render("profile", {
        layout: "form_layout"
    });
});

app.post("/profile",function(req,res){
    db.addProfile(req.session.user.id, req.body.age, req.body.city, req.body.url);
    res.redirect("/petition");
});

app.get("/signers", function(req, res) {
    db.listSigners().then(signers => {
        res.render("signers", {
            names: signers,
            layout: "form_layout"
        });
    });
});

app.get("/logout", function(req, res) {
    req.session = null;
    res.redirect("/welcome");
});

app.get("/login", function(req, res) {
    if(req.session.user){
        if(req.session.user.hasSigned){
            res.redirect("/thank_you");
        }else{
            res.redirect("/petition");
        }
    }else{
        res.render("formLogin", {
            email: req.session.email,
            layout: "form_layout"
        });
    }
});

app.post("/login", function(req, res) {
    if (req.body.email && req.body.password) {
            db.getUserInfoByEmail(req.body.email)
            .then(userInfo=>{
                if(userInfo.rows[0]){
                    req.session.user = {
                        id: userInfo.rows[0].id,
                        first: userInfo.rows[0].first,
                        last: userInfo.rows[0].last,
                        email: userInfo.rows[0].email,
                        age: userInfo.rows[0].age,
                        city: userInfo.rows[0].city,
                        url: userInfo.rows[0].url,
                        hasSigned: userInfo.rows[0].hassigned,
                        isLoggedIn: true
                    }
                    db.checkPassword(req.body.password, userInfo.rows[0].pass)
                    .then(doesMatch=>{
                        if(doesMatch){
                            if( req.session.user.hasSigned ){
                                req.session.user.hasSigned=true;
                                res.redirect("/thank_you");
                            }else {
                                req.session.user.hasSigned=false;
                                res.redirect("/petition");
                            }
                        }else{
                            res.render("formLogin", {
                                err: "Passwords don't match. Try again, register or ask for a new password",
                                layout: "form_layout"
                            });
                        }
                    }).catch(err=>{
                        console.log("error when checking if passwords match", err);
                    });
                }else{
                    res.render("formLogin", {
                        err: "User does not exist. Try again or register!",
                        layout: "form_layout"
                    });
                }
            }).catch(err=>{
                console.log("err in getUserInfoByEmail in /login", err);
            })
    }else{
        res.render("formLogin", {
            err: "Please fill in all fields",
            layout: "form_layout"
        });
    }
});

app.get("/register", function(req, res) {
    res.render("formRegister", {
        layout: "form_layout"
    });
});

app.post("/register", function(req, res) {
    db.getUserInfoByEmail(req.body.email)
    .then(userInfo=>{
        if(userInfo.rows[0]){
            req.session.user = {
                id: userInfo.rows[0].id,
                first: userInfo.rows[0].first,
                last: userInfo.rows[0].last,
                email: userInfo.rows[0].email,
                age: userInfo.rows[0].age,
                city: userInfo.rows[0].city,
                url: userInfo.rows[0].url,
                hasSigned:userInfo.rows[0].hassigned,
                isLoggedIn: true
            }
            if(req.body.password){
                db.checkPassword(req.body.password,userInfo.rows[0].pass).then(doesMatch=>{
                    if(doesMatch){
                        if( req.session.user.hasSigned ){
                            req.session.user.hasSigned=true;
                            res.redirect("/thank_you");
                        }else {
                            req.session.user.hasSigned=false;
                            res.redirect("/petition");
                        }
                    }else{
                        res.render("formRegister",{
                            err:"wrong password",
                            layout:"form_layout"
                        })
                    }
                }).catch(err=>{
                    console.log("error when checking if passwords match", err);
                });
            }

        }else if(!userInfo.rows[0]){
            if(
                req.body.first &&
                req.body.last &&
                req.body.email &&
                req.body.password
            ){
                hashPassword(req.body.password)
                .then(hashedPassword=>{
                    db.createUser(
                        req.body.first,
                        req.body.last,
                        req.body.email,
                        hashedPassword
                    ).then(createdUser=>{
                        req.session.user = {
                            id: createdUser.rows[0].id,
                            first: req.body.first,
                            last: req.body.last,
                            email: req.body.email
                        }
                        res.redirect("/profile");
                    }).catch(err=>{console.log("err while creating user : ", err);})
                }).catch(err=>{console.log("err while hashing pass : ", err);})
            }else{
                res.render("formRegister", {
                    err: "Please fill out all fields",
                    layout: "form_layout"
                });
            }
        }
    }).catch(err=>{console.log("err when getUserInfoByEmail /register:",err);})
});

app.get("/edit", function(req, res) {
    if(req.session.user){
        if(req.session.user.id){
            db.getUserInfoByEmail(req.session.user.email).then(userInfo=>{
                if(userInfo.rows[0]){
                    res.render("edit", {
                        first: userInfo.rows[0].first,
                        last: userInfo.rows[0].last,
                        email: userInfo.rows[0].email,
                        pass: userInfo.rows[0].pass,
                        age: userInfo.rows[0].age,
                        city: userInfo.rows[0].city,
                        url: userInfo.rows[0].url,
                        layout: "form_layout"
                    });
                }else{
                    res.redirect('/login');
                }
            }).catch(err=>{
                console.log("err",err);
            });
        }else {
            res.redirect('/login');
        }
    }else {
        res.redirect('/login');
    }
});

app.post("/edit", function(req, res){
    req.session.user.first = req.body.first || req.session.user.first;
    req.session.user.last = req.body.last || req.session.user.last;
    req.session.user.email = req.body.email || req.session.user.email;
    req.session.user.age = req.body.age || req.session.user.age;
    let url = req.body.url && req.body.url.match(/(?:http(?:s)?:\/\/)?(?:www\.)?(.+)/)[1];
    req.session.user.url = url || req.session.user.url;
    db.upsertProfile(req.session.user.id, req.body.first, req.body.last, req.body.email,
        req.body.pw, req.body.age, req.body.city, url).catch(err => console.log(err));
    res.redirect('/thank_you');
});


function updateCookies(email){
    db.getUserInfoByEmail(email).then(
    ).catch(err=>{
        console.log("problem with updating cookies! err : ",err);
    })
    req.session.user = {
        id: userInfo.rows[0].id,
        first: userInfo.rows[0].first,
        last: userInfo.rows[0].last,
        email: userInfo.rows[0].email,
        age: userInfo.rows[0].age,
        city: userInfo.rows[0].city,
        url: userInfo.rows[0].url,
        hasSigned:userInfo.rows[0].hassigned,
        isLoggedIn: true
    }
    return req.session.user;
}

app.listen(process.env.PORT || 8080, function() {
    console.log("listening....");
});
