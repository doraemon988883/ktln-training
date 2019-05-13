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
        console.log('MOuse is on Page:', __CURRENT_PAGE);

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
        // ctx.moveTo(fromx, fromy);
        // ctx.lineTo(tox, toy);
        // ctx.stroke();
        
        // ctx.fillStyle = "#ff0";
        // ctx.fillRect(tox, toy, 20, 20);

        //Apply Difference between PDF and Canvas
        // console.log("DiffSize:", difSizeWidth, difSizeHeight)
        // fromx = fromx*Xscale;
        // fromy = fromy*Yscale;
        // tox = tox*Xscale;
        // toy = toy*Yscale;

        if(drawMethod === drawType.PENCIL){
            // ctx.save();
            // ctx.translate(panX,panY);
            // ctx.scale(scaleFactorX,scaleFactorY);
            // ctx.beginPath();

            ctx.globalCompositeOperation = "source-over";
            ctx.moveTo(fromx, fromy);
            ctx.lineTo(tox, toy);
            // ctx.closePath();
            ctx.stroke();

            // ctx.restore();
        } else if(drawMethod === drawType.HIGHLIGHT){

            // ctx.save();
            // ctx.translate(panX,panY);
            // ctx.scale(scaleFactorX,scaleFactorY);
            // ctx.beginPath();

            console.log("Draw Highlight POS:", tox, toy);
            ctx.globalCompositeOperation = "multiply";
            ctx.fillStyle = "#ff0";
            // ctx.closePath();

            ctx.fillRect(tox, toy, 20, 20);

            // ctx.restore();

        }

        //Lưu thông tin Draw
        
        points[__CURRENT_PAGE].push({
            fromX: fromx,
            fromY: fromy,
            toX: tox,
            toY: toy,
            color: "red",
            drawMethod: drawMethod
        });
    }

});