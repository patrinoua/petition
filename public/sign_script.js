var canvas=$('#myCanvas');
var context=$('#myCanvas')[0].getContext('2d');
var hasSigned = 0;
canvas.on('mousedown',(e)=>{
    // console.log('began path!');
    context.moveTo(e.offsetX,e.offsetY);
    canvas.on('mousemove', function(e){
        drawing(e.offsetX, e.offsetY);
        hasSigned=1;
    });
})

$(document).on('mouseup',function(){
    if(hasSigned){
        $('#signature').val(canvas[0].toDataURL());
    }
    canvas.off('mousemove');
});

function drawing(x,y){
    context.lineTo(x,y);
    context.stroke();
}
