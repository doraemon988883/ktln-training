$(function(){

    // This demo depends on the canvas element
    if(!('getContext' in document.createElement('canvas'))){
        alert('Sorry, it looks like your browser does not support canvas!');
        return false;
    }


    var doc = $(document),
        win = $(window),
        canvas = $('#paper'),
        ctx = canvas[0].getContext('2d'),
        instructions = $('#instructions');

        

    // Generate an unique ID
    var id = Math.round($.now()*Math.random());

    // A flag for drawing activity
    var drawing = false;

    var clients = {};
    var cursors = {};


    var prev = {};

    canvas.on('mousedown',function(e){
        console.log('Mousedown event call:', e)
        e.preventDefault();
        drawing = true;
        prev.x = e.offsetX;
        prev.y = e.offsetY;

        // Hide the instructions
        instructions.fadeOut();
    });

    doc.bind('mouseup mouseleave',function(){
        drawing = false;
    });


    doc.on('mousemove',function(e){
        

        // Draw a line for the current user's movement, as it is
        // not received in the socket.on('moving') event above

        if(drawing){
            console.log('mousemove is called', prev.x, prev.y, e.offsetX, e.offsetY)

            drawLine(prev.x, prev.y, e.offsetX, e.offsetY);

            prev.x = e.offsetX;
            prev.y = e.offsetY;
        }
    });

    // Remove inactive clients after 10 seconds of inactivity
    setInterval(function(){

        for(ident in clients){
            if($.now() - clients[ident].updated > 10000){

                // Last update was more than 10 seconds ago.
                // This user has probably closed the page

                cursors[ident].remove();
                delete clients[ident];
                delete cursors[ident];
            }
        }

    },10000);

    function drawLine(fromx, fromy, tox, toy){
        ctx.moveTo(fromx, fromy);
        ctx.lineTo(tox, toy);
        ctx.stroke();
    }

});