(function () {
    'use strict';

    var $icHeader = document.querySelector('.ic-header'),
        $icContent = document.querySelector('.ic-content'),
        querySelectorToArray = function (querySelector) {
            return Array.prototype.slice.call(querySelector);
        },

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
        },
        sections = {
            elements: document.querySelectorAll('.section'),
            current: '',
            hideAll: function () {
                querySelectorToArray(this.elements).forEach(function (element) {
                    element.classList.remove('show');
                });
            },
            show: function (className) {
                sections.hideAll();

                this.current = querySelectorToArray(this.elements).filter(function (element) {
                    if (element.classList.contains(className) === true) {
                        return element;
                    }
                })[0];

                this.current.classList.add('show');
            }
        },
        instagram = {
            init: function () {
                if (instagram.verificaSeTemUsuarioLogado()) {
                    console.log('Carregar fotos!');
                } else {
                    console.log('Exibe: login');
                    sections.show('section-login');
                }
            },
            verificaSeTemUsuarioLogado: function () {
                console.log('Verifica: login');
                return !!localStorage['ic-instagram-token'];
            }
        };

    /*
        Init functions
    */
    setContentHeight.set();
    setContentHeight.setOnResize();

    sections.show('section-loading');
    instagram.init();
}(document, window));