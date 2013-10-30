(function () {
    'use strict';

    var $icHeader = document.querySelector('.ic-header'),
        $icContent = document.querySelector('.ic-content'),

        /*
            Set .ic-content height based in .ic-header height to simulate position fixed
        */
        setContentHeight = {
            getHeight: function () {
                return window.innerHeight - $icHeader.offsetHeight;
            },
            setHeight: function (newHeight) {
                $icContent.style.height = newHeight + 'px';
            },
            set: function () {
                this.setHeight(this.getHeight());
            },
            setOnResize: function () {
                var time,
                    self = this;

                window.addEventListener('resize', function () {
                    clearTimeout(time);

                    time = setTimeout(function () {
                        self.set();
                    }, 300);
                });
            }
        };

    /*
        Init functions
    */
    setContentHeight.set();
    setContentHeight.setOnResize();
}(document, window));