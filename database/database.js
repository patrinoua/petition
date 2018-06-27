var bcrypt = require('bcrypt');

var spicedPg = require('../node_modules/spiced-pg');

var db;
if(process.env.DATABASE_URL){
    db = spicedPg(process.env.DATABASE_URL);
}else {
    db = spicedPg('postgres:funky:chicken@localhost:5432/signers');
}

// ************** LOGIN *************
function checkForUser(email){
    return db.query('SELECT * FROM users WHERE email=$1',[email]);
}
function checkPassword(textEnteredInLoginForm, hashedPasswordFromDatabase) {
    return new Promise(function(resolve, reject) {
        bcrypt.compare(textEnteredInLoginForm, hashedPasswordFromDatabase, function(err, doesMatch) {
            if (err) {
                reject(err);
            } else {
                resolve(doesMatch);
            }
        });
    });
}
// ************* GET USER INFO ****************
function getUserInfoByEmail(email){
    return db.query('SELECT users.id, first, last, email, pass, age, city, url, signatures.id AS hassigned FROM users LEFT JOIN user_profiles ON users.id = user_profiles.user_id LEFT JOIN signatures ON users.id=signatures.user_id WHERE users.email =  $1', [email])
}

function checkIfSigned(user_id){
    return db.query('SELECT id FROM signatures WHERE user_id = $1',[user_id]);
}
// ************ PROFILE *******************
function addProfile(user_id, age, city, url){
    return db.query('INSERT INTO user_profiles (user_id, age, city, url) VALUES ($1, $2, $3, $4)', [ user_id, +age , city , url ]);
}

function hasProfile(user_id){
    return db.query('SELECT id FROM user_profiles WHERE user_id = $1',[user_id]);
}

const hashPW = pw =>
    new Promise((resolve, reject) =>
        bcrypt.genSalt((err, salt) => {
            if (err) {
                return reject(err);
            }
            bcrypt.hash(pw, salt, (err, hash) => err ? reject(err) : resolve(hash))
        }));

exports.upsertProfile = (id, first, last, email, pw, age, city, url) =>
    pw ? hashPW(pw).then((hash) => db.query('UPDATE users SET first = $1, last = $2, email = $3, pass = $4 WHERE id = $5', [first, last, email, hash, id]))
         .then(() => db.query('INSERT INTO profiles (age, city, url, user_id) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO UPDATE SET age = $1, city = $2, url = $3', [age, city, url, id]))

       : db.query('UPDATE users SET first = $1, last = $2, email = $3 WHERE id = $4', [first, last, email, id])
         .then(() => db.query('INSERT INTO profiles (age, city, url, user_id) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO UPDATE SET age = $1, city = $2, url = $3', [age, city, url, id]))

function getSignature(user_id){
    return db.query('SELECT * FROM signatures WHERE user_id =$1',[user_id]);
}
function deleteSignature(user_id){
    return db.query(`DELETE FROM signatures WHERE user_id = $1`,[user_id]);
}
function saveSignature(user_id, sig){
    return db.query('INSERT INTO signatures (user_id, signature) VALUES ($1, $2) RETURNING id', [user_id, sig]);
}
function listSigners(){
    return db.query(`SELECT first, last, age, city, url
                    FROM signatures LEFT JOIN users ON users.id=signatures.user_id
                    LEFT JOIN user_profiles ON users.id=user_profiles.user_id
                    ORDER BY users.id DESC`)
                    .then(function(result){
                        return result.rows;
                    });
}
// *********** REGISTER ***************
function createUser(first, last, email, password){
    return db.query('INSERT INTO users (first, last, email, pass) VALUES ($1, $2, $3, $4) RETURNING id',
    [first, last, email, password]);
}


// FUNCTION

exports.saveSignature = saveSignature;
exports.createUser = createUser;
exports.listSigners= listSigners;
exports.getSignature = getSignature;
exports.checkForUser = checkForUser;
exports.checkPassword = checkPassword;
exports.getUserInfoByEmail = getUserInfoByEmail;

exports.checkIfSigned = checkIfSigned;

exports.addProfile = addProfile;
exports.hasProfile = hasProfile;

// UPDATING USER
// exports.updateUsersInfo = updateUsersInfo;
// exports.updateUserProfiles = updateUserProfiles;
// exports.updatePassword = updatePassword;

exports.deleteSignature = deleteSignature;
// exports.upsertProfile = upsertProfile;
