(function() {

        MoQR.options.dependencies = {
                MoCP   : "src/MoCP.js",
                jQuery : "http://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js"
        };

        MoQR.options.collections = {

        };

        require(["|MoCP|", "|jQuery|"], function(MoCP) {
                var max   = 1;

                var start = new Date();
                for ( var i = 0 ; i < max; i++ ) {
                        var promise = MoCP.preload({taglibs:["m"]}).render( "test/test0.html", {
                                i             : 3,
                                obj           : "value",
                                variable      : "Variable passed from model",
                                myModelProperty : "My model property",
                                array        : ["item10", "item11", "item12"],
                                arrayNested  : [
                                        ["item20", "item21", "item22"],
                                        ["item30", "item31", "item32"]
                                ],
                                map    : {
                                        key10: "val10",
                                        key11: "val11"
                                },
                                mapNested   : {
                                        map0 : {
                                                key20: "val20",
                                                key21: "val21"
                                        },
                                        map1 : {
                                                key30: "val30",
                                                key31: "val31"
                                        }
                                },

                                method : function() {
                                        return "methodReturns"
                                }
                        });

                        abc(promise, start, i, max);


                }
        }, {args:true});


        function abc(promise, start, i, max) {
                promise.done(function(template, model){
                        if ( i+1 == max ) {
                                jQuery("body").append("<br/>Milliseconds to render: " + (new Date() - start) )
                                jQuery("body").append(template);
                                console.log(model)
                        }
                });
        }
})();













