(function(){
    // a data map of the tooltip orientation type to the type of direction the
    // tooltip arrow should take as a result
    var TIP_ORIENT_ARROW_DIR_MAP = {
        "top": "down",
        "bottom": "up",
        "left": "right",
        "right": "left"
    };
    // the OuterTriggerManager managing outer-trigger listeners for dismissing
    //  tooltips. Shared with all tooltips
    var OUTER_TRIGGER_MANAGER;
    // a mapping of preset trigger styles to callback functions returning
    // CachedListener lists
    var PRESET_STYLE_LISTENERFNS;

    var PREV_SIB_SELECTOR = "_previousSibling";
    var NEXT_SIB_SELECTOR = "_nextSibling";
    
    /** isValidOrientation: (string)
    *
    *   utility function to simply return if the given orientation is 
    *   one listed in the top data map
    **/
    function isValidOrientation(orient){
        return orient in TIP_ORIENT_ARROW_DIR_MAP;
    }


    /** getRect: DOM element => {top: number, left: number, 
                                  right: number, bottom: number,
                                  width: number, height: number}

    returns the absolute metrics of the given DOM element in relation to the
    document
    **/
    function getRect(el){
        var rect = el.getBoundingClientRect();
        var docElem = document.documentElement;
        var documentScrollTop = (docElem.scrollTop ||
                                   document.body.scrollTop || 0);
        var documentScrollLeft = (docElem.scrollLeft ||
                                    document.body.scrollLeft || 0);
        return {
            "left": rect.left + documentScrollLeft,
            "right": rect.right + documentScrollLeft,
            "top": rect.top + documentScrollTop,
            "bottom": rect.bottom + documentScrollTop,
            "width": rect.width,
            "height": rect.height
        };
    }

    // return the scaling difference between the raw size and the transformed
    // size of the element
    function getScale(el, rect){
        // the raw offset values (without accounting for css transform)
        var rect = (rect !== undefined) ? rect : getRect(el);
        return {
            "x" : ((el.offsetWidth) ? (rect.width / el.offsetWidth) : 1),
            "y" : ((el.offsetHeight) ? (rect.height / el.offsetHeight) : 1)
        };
    }
    
    /** CachedListener : (DOM, string, Function)
    * a simple struct to store all information needed to add and remove
    * a particular event listener
    *
    * used to track a single event listener so that it can easily be 
    * bound/unbound
    * 
    * constructor params:
    *   elem                    the DOM element the event listener should be
    *                           bound/unbound to
    *   eventType               the name of the event that we want to 
    *                           bind/unbind listeners for
    *   listenerFn              a callback function to bind/unbind for the
    *                           given event on the given element
    **/
    function CachedListener(elem, eventType, listenerFn){
        this.eventType = eventType;
        this.listenerFn = listenerFn;
        this.elem = elem;
        this._attachedFn = null;
    }
    
    
    /** CachedListener.attachListener
    *   
    *   binds the event listener as described by the struct
    **/
    CachedListener.prototype.attachListener = function(){
        if(!this._attachedFn){
            this._attachedFn = xtag.addEvent(this.elem, this.eventType, 
                                             this.listenerFn);
        }
    };
    
    
    /** CachedListener.attachListener
    *   
    *   unbinds the event listener as described by the struct
    **/
    CachedListener.prototype.removeListener = function(){
        if(this._attachedFn){
            xtag.removeEvent(this.elem, this.eventType, this._attachedFn);
            this._attachedFn = null;
        }
    };
    
    
    /** OuterTriggerEventStruct: (string)
    * 
    *  an object maintaining a single CachedListener for each of a single event 
    *  type to handle dismissing all tooltips corresponding to that event type
    *  when the event is triggered outside of it.
    *  Maintains a list of tooltips to which this listener applies
    *
    *  constructor params:
    *     eventType                 the literal name of the event to listen for
    *                               ie: "click", not "click:delegate(foo)"
    **/
    function OuterTriggerEventStruct(eventType){
        this._cachedListener = null;
        this._tooltips = [];
        
        var struct = this;
        // set up the function that will be attached to the body to handle
        // dismissal of tooltips
        var outerTriggerListener = function(e){
            struct._tooltips.forEach(function(tooltip){
                // only dismiss the tooltip if:
                // - we have not flagged this outer trigger as skipped
                // - the tooltip is even dismissable by outer triggers
                // - we are not triggering inside the tooltip itself
                if((!tooltip.xtag._skipOuterClick) && 
                   tooltip.hasAttribute("visible") &&
                   (!tooltip.hasAttribute("ignore-outer-trigger")) &&
                   (!hasParentNode(e.target, tooltip)))
                {
                    _hideTooltip(tooltip);
                }
                tooltip.xtag._skipOuterClick = false;
            });
        };
        var cachedListener = this._cachedListener = new CachedListener(
                                                            document, eventType, 
                                                            outerTriggerListener
                                                        );
        cachedListener.attachListener();
    }
    
    /** OuterTriggerEventStruct.destroy
    *  unbinds the maintained cached listener and removes internal references
    **/
    OuterTriggerEventStruct.prototype.destroy = function(){
        this._cachedListener.removeListener();
        this._cachedListener = null;
        this._tooltips = null;
    };
    
    /** OuterTriggerEventStruct.containsTooltip: (DOM) => Boolean
    *
    * determines if this struct is responsible for handling the given tooltip
    **/
    OuterTriggerEventStruct.prototype.containsTooltip = function(tooltip){
        return this._tooltips.indexOf(tooltip) !== -1;
    };
    
    /** OuterTriggerEventStruct.addTooltip: (DOM) 
    *
    * adds the given toolip to the list of tooltips this struct is 
    * responsible for
    **/
    OuterTriggerEventStruct.prototype.addTooltip = function(tooltip){
        if(!this.containsTooltip(tooltip)){
            this._tooltips.push(tooltip);
        }
    };
    
    /** OuterTriggerEventStruct.removeTooltip: (DOM) 
    *
    * removes the given tooltip from the list of tooltips this struct 
    * is responsible for
    **/
    OuterTriggerEventStruct.prototype.removeTooltip = function(tooltip){
        if(this.containsTooltip(tooltip)){
            this._tooltips.splice(this._tooltips.indexOf(tooltip), 1);
        }
    };
    
    /** OuterTriggerEventStruct.numTooltips
    *   property returning the number of tooltips this struct is currently
    *   maintaining
    **/
    Object.defineProperties(OuterTriggerEventStruct.prototype, {
        "numTooltips": {
            get: function(){
                return this._tooltips.length;
            }
        }
    });
    
    /** OuterTriggerManager
    *
    * manages a dictionary of event types mapped to OuterTriggerEventStruct objs
    **/
    function OuterTriggerManager(){
        this.eventStructDict = {};
    }
    
   /** OuterTriggerManager.registerTooltip : (string, DOM)
    *
    * adds a tooltip to the event dictionary and sets it to be handled by the
    * struct for the given type
    **/
    OuterTriggerManager.prototype.registerTooltip = function(eventType, 
                                                             tooltip)
    {
        // if event already in dict, just make the existing struct responsible
        // for the tooltip
        if(eventType in this.eventStructDict){
            var eventStruct = this.eventStructDict[eventType];
            if(!eventStruct.containsTooltip(tooltip)){
                eventStruct.addTooltip(tooltip);
            }
        }
        // if event does not yet exist, set up new struct for it
        else{
            this.eventStructDict[eventType] = 
                new OuterTriggerEventStruct(eventType);
            this.eventStructDict[eventType].addTooltip(tooltip);
        }
    };
    
    /** OuterTriggerManager.unregisterTooltip : (string, DOM)
    *
    * removes a tooltip from the event dictionary and unsets it from being 
    * handled by the struct for the given event type
    **/
    OuterTriggerManager.prototype.unregisterTooltip = function(eventType, 
                                                               tooltip)
    {
        if(eventType in this.eventStructDict && 
           this.eventStructDict[eventType].containsTooltip(tooltip))
        {
            var eventStruct = this.eventStructDict[eventType];
            eventStruct.removeTooltip(tooltip);
            if(eventStruct.numTooltips === 0){
                eventStruct.destroy();
                delete(this.eventStructDict[eventType]);
            }
        }
    };
    
    // make this a globally defined variable to track information about all
    // tooltips, not just a single one
    OUTER_TRIGGER_MANAGER = new OuterTriggerManager();
    
    
    
    
    /** _mkPrevSiblingTargetListener: (DOM, string, function) => CachedListener
    * 
    * creates and returns a CachedListener representing a "delegated" event
    * listener on the body for the previous sibling of the tooltip
    *
    * fakes a delegated event, since there isn't a reliable single-shot
    * CSS selector for the previous sibling of a specific unnamed element
    *
    * callback will be called with a 'this' scope of the tooltip's 
    * previous sibling element
    *
    * params:
    *   tooltip                     the x-tooltip element we are working in
    *                               relation to
    *   eventName                   the raw name of the event to listen for
    *                               (ex: "click")
    *   callback                    the callback function to call when the
    *                               the tooltip's previous sibling is triggered;
    *                               will be called using said sibling as the
    *                               'this' scope
    **/
    function _mkPrevSiblingTargetListener(tooltip, eventName, callback){
        var filteredCallback = function(e){
            if(callback && hasParentNode(e.target, 
                                         tooltip.previousElementSibling))
            {
                // make sure to change the this binding to be that of the 
                // "delegated" previous sibling element
                callback.call(tooltip.previousElementSibling, e);
            }
        };
        
        // note that we attach to document.documentElement so that this
        // gets fired before any outer-click handlers (which are attached to
        // document)
        return new CachedListener(document.documentElement, eventName, 
                                  filteredCallback);
    }
    
    
    /** _mkNextSiblingTargetListener: (DOM, string, function) => CachedListener
    * 
    * creates and returns a CachedListener representing a "delegated" event
    * listener on the body for the next sibling of the tooltip
    *
    * fakes a delegated event, since there isn't a reliable single-shot
    * CSS selector for the next sibling of a specific unnamed element
    *
    * callback will be called with a 'this' scope of the tooltip's 
    * previous sibling element
    *
    * params:
    *   tooltip                     the x-tooltip element we are working in
    *                               relation to
    *   eventName                   the raw name of the event to listen for
    *                               (ex: "click")
    *   callback                    the callback function to call when the
    *                               the tooltip's next sibling is triggered;
    *                               will be called using said sibling as the
    *                               'this' scope
    **/
    function _mkNextSiblingTargetListener(tooltip, eventName, callback){
        var eventDelegateStr = eventName+":delegate(x-tooltip+*)";
        var filteredCallback = function(e){
            if(callback && this === tooltip.nextElementSibling){
                // make sure to change the this binding to be that of the 
                // "delegated" next sibling element
                callback.call(this, e);
            }
        };
        
        // note that we attach to document.documentElement so that this
        // gets fired before any outer-click handlers (which are attached to
        // document)
        return new CachedListener(document.documentElement, eventDelegateStr, 
                                  filteredCallback);
    }
    
    
    /** _getTargetDelegatedListener: (DOM, string, string, function) => 
     *                                  CachedListener
     *
     * given a callback function to call on elements selected by the given 
     * targetSelector, returns a single CachedListener representing the
     * listener for a delegated event that calls the given callback function
     *
     * params:
     *   tooltip                     the x-tooltip element we are working in
     *                               relation to
     *   targetSelector              the string used to select the elements
     *                               to delegate as targets; follows the same
     *                               rules as x-tooltip's targetSelector
     *                               accessor
     *   eventName                   the raw name of the event to listen for
     *                               (ex: "click")
     *   callback                    the callback function to call when a
     *                               target element is triggered;
     *                               will be called using said element as the
     *                               'this' scope
    **/
    function _getTargetDelegatedListener(tooltip, targetSelector, eventName, 
                                         targetCallback)
    {
        if(targetSelector === PREV_SIB_SELECTOR){
            return _mkPrevSiblingTargetListener(tooltip, eventName, 
                                               targetCallback);
        }
        else if(targetSelector === NEXT_SIB_SELECTOR){
            return _mkNextSiblingTargetListener(tooltip, eventName, 
                                               targetCallback);
        }
        else{
            var delegateEventStr = eventName+":delegate("+targetSelector+")";
            
            // note that we attach to document.documentElement so that this
            // gets fired before any outer-click handlers (which are attached to
            // document)
            return new CachedListener(
                            document.documentElement, delegateEventStr, 
                            function(e){
                                var delegatedElem = this;
                                // filter out elements that are already
                                // part of the tooltip
                                if(!hasParentNode(delegatedElem, tooltip)){
                                    // remember to bind 'this' scope!
                                    targetCallback.call(delegatedElem, e);
                                }
                            }
                        );
        }
    }
    
    
    /** PRESET_STYLE_LISTENERFNS
     * 
     * A data map of trigger "styles" mapped to callback functions that return
     * lists of the CachedListeners that the tooltip would need to bind
     * to properly show/hide the tooltip
     *
     * NOTE: DO NOT ATTACH LISTENERS HERE, LET THE CALLER DO IT
    **/
    PRESET_STYLE_LISTENERFNS = {
        /* the "custom" style provides no default event listener functionality;
         * this is useful if the user wishes to do their own custom triggerstyle
         */
        "custom": function(tooltip, targetSelector){
            return [];
        },
        /* the "hover" style allows the tooltip to be shown upon hovering over
         * a targeted element. The tooltip is hidden upon hovering off the
         * target/tooltip
         */
        "hover": function(tooltip, targetSelector){
            var createdListeners = [];
            
            // need a small delay before hiding a tooltip on hovering off the 
            // target in order to give the user a chance to interact with the
            // tooltip before it is hidden
            var hoverOutTimer = null;
            var hideDelay = 200; 
            var cancelTimerFn = function(){
                if(hoverOutTimer){
                    window.clearTimeout(hoverOutTimer);
                }
                hoverOutTimer = null;
            };
            
            /** set up callbacks for target elements **/
            
            // callback function for when a target element is hovered over
            var showTipTargetFn = mkIgnoreSubchildrenFn(function(e){
                cancelTimerFn();
                var delegatedElem = this;
                // don't trigger show when coming from a tooltip element
                var fromElem = e.relatedTarget || e.toElement;
                if(!hasParentNode(fromElem, tooltip)){
                    _showTooltip(tooltip, delegatedElem);
                }
            });
            
            // callback function for when a target element is hovered off
            var hideTipTargetFn = mkIgnoreSubchildrenFn(function(e){
                cancelTimerFn();
                // don't trigger hide when exiting to a tooltip element
                var toElem = e.relatedTarget || e.toElement;
                if(!hasParentNode(toElem, tooltip)){
                    // add delay before hide so that we can interact w/ tooltip
                    hoverOutTimer = window.setTimeout(function(){
                        if(tooltip.triggerStyle === "hover")
                        {
                            _hideTooltip(tooltip);
                        }
                    }, hideDelay);
                }
            });
            
            //create CachedListeners for target elements
            var targetEnterListener = _getTargetDelegatedListener(
                                        tooltip, targetSelector, "enter", 
                                        showTipTargetFn
                                      );
            var targetExitListener = _getTargetDelegatedListener(
                                        tooltip, targetSelector, "leave", 
                                        hideTipTargetFn
                                      );
            createdListeners.push(targetEnterListener);
            createdListeners.push(targetExitListener);    
            
            /** set up callbacks for the tooltip **/
            
            // callback function for when the tooltip itself is hovered over
            var showTipTooltipFn = mkIgnoreSubchildrenFn(function(e){
                cancelTimerFn();
                // don't trigger show when coming from the target element
                var fromElem = e.relatedTarget || e.toElement;
                var lastTarget = tooltip.xtag.lastTargetElem;
                // also don't trigger a reshow unless we are actually hidden
                // (ie: unless the last target is also the CURRENT target
                if(!tooltip.hasAttribute("visible") &&
                    lastTarget && !hasParentNode(fromElem, lastTarget))
                {
                    _showTooltip(tooltip, lastTarget);
                }
            });
            
            // callback function for when the tooltip itself is hovered off
            var hideTipTooltipFn = mkIgnoreSubchildrenFn(function(e){
                cancelTimerFn();
                // don't get triggered when exiting to the target element
                var toElem = e.relatedTarget || e.toElement;
                var lastTarget = tooltip.xtag.lastTargetElem;
                if(lastTarget && !hasParentNode(toElem, lastTarget))
                {
                    // add delay so that we can interact with tooltip
                    hoverOutTimer = window.setTimeout(function(){
                        if(tooltip.triggerStyle === "hover")
                        {
                            _hideTooltip(tooltip);
                        }
                    }, hideDelay);
                }
            });
            
            // also create/add the CachedListeners fo rthe tooltip itself
            createdListeners.push(
                new CachedListener(tooltip, "enter", showTipTooltipFn)
            );
            createdListeners.push(
                new CachedListener(tooltip, "leave", hideTipTooltipFn)
            );
            
            return createdListeners;
        }
    };
    
    
    /** mkGenericListeners: (DOM, string, string) => list of CachedListener
    
     given an event type, create and return a list of CachedListeners that
     represents the user workflow where 
     triggering such an event on a target elem toggles the tooltip visibility
     
     (the handlers for dismissing the tooltip on clicking outside it are handled
      by the OUTER_TRIGGER_MANAGER)
    **/
    function mkGenericListeners(tooltip, targetSelector, eventName){
        var createdListeners = [];
            
        // create and add the visibility-toggling click callback on target
        // elements
        var targetTriggerFn = function(e){
            var delegatedElem = this;
            tooltip.xtag._skipOuterClick = true;
            if(tooltip.hasAttribute("visible")){
                // case where we are toggling the tooltip off by triggering the
                // same element that turned it on
                if(delegatedElem === tooltip.xtag.lastTargetElem){
                    _hideTooltip(tooltip);
                }
                // case where we are clicking over to another target of the same
                // element while the tooltip is still visible
                else{
                    _showTooltip(tooltip, delegatedElem);
                }
            }
            // case where we are simply showing a hidden tooltip
            else{
                // note: while e.target is the literally clicked element, and
                // e.currentTarget is wherever the delegated event was bound,
                // this is the the element that actually matches the delegation
                // selector
                _showTooltip(tooltip, delegatedElem);
            }
        };
        
        var delegatedTargetListener = _getTargetDelegatedListener(
                                        tooltip, targetSelector, eventName, 
                                        targetTriggerFn
                                      );
        createdListeners.push(delegatedTargetListener);
        
        return createdListeners;
    }
    
    
    /** hasParentNode: (DOM, DOM) => Boolean
    * 
    *  utility function that determines if the given element actually has the 
    *  proposed parent element as a parent or ancestor node
    **/
    function hasParentNode(elem, parent){
        if(parent.contains){
            return parent.contains(elem);
        }
        else{
            while(elem){
                if(elem === parent){
                    return true;
                }
                elem = elem.parentNode;
            }
            return false;
        }
    }
    
    
    /** mkIgnoreSubchildrenFn: Function => Function
     *
     * creates and returns a callback function that ignores events triggered 
     * by crossing between children of the same listening node
     *
     * this affects events by:
     * - for mouseover events, only fires callback when
     *   the mouse first enters the element that has the mouseover event 
     *   listener attached to it and ignores any mouseovers between children
     *   elements in this same container element; essentially emulates jQuery's
     *   mouseenter polyfill
     * - for mouseout events, only fires callback when the mouse actually
     *   completely exits the element that has the mouseleave event 
     *   listener attached to it and ignores any mouseouts that exit to 
     *   somewhere that is still within the listening container element;
     *   emulates jQuery's mouseleave polyfill
     * - acts normally for any non-mouseover/mouseleave events
     *
     * params:
     *      callback                    a callback function taking an event
     *                                  to be called when moving between
     *                                  two elements not both in the same
     *                                  listening element
     *                                  IMPORTANT NOTE: the callback will
     *                                  be called with a "this" scope of its
     *                                  containing element
     **/
    function mkIgnoreSubchildrenFn(callback){
        return function(e){
            var containerElem = this;
            var relElem = e.relatedTarget || e.toElement;
            
            if(relElem)
            {
                if(!hasParentNode(relElem, containerElem)){
                    callback.call(this, e);
                }
            }
            // if not a event where we need to ignore subchildren, don't change
            // how the callback gets called
            else{
                callback.call(this, e);
            }
        };
    }
    
    
    /** _selectorToElems: (x-tooltip, string) => DOM list
     *
     * returns list of DOM elements selected by the given selector string 
     * in relation to the tooltip
     *
     * If given PREV_SIB_SELECTOR, returns the previous sibling of the tooltip
     * If given NEXT_SIB_SELECTOR, returns the next sibling of the tooltip
     * Otherwise, applies the selector as a CSS query selector on the document
     */
    function _selectorToElems(tooltip, selector){
        var elems = [];
        if(selector === PREV_SIB_SELECTOR){
            elems = (tooltip.previousElementSibling) ? 
                      [tooltip.previousElementSibling] : [];
        }
        else if(selector === NEXT_SIB_SELECTOR){
            elems = (tooltip.nextElementSibling) ? 
                      [tooltip.nextElementSibling] : [];
        }
        // otherwise, apply as CSS selector string
        else{
            elems = xtag.query(document, selector);
        }
        
        // filter out elements that are part of the tooltip itself
        var i = 0;
        while(i < elems.length){
            var elem = elems[i];
            if(hasParentNode(elem, tooltip)){
                elems.splice(i, 1);
            }
            else{
                i++;
            }
        }
        return elems;
    }
    
    
    /** overlaps: (DOM, DOM) => Boolean
    *
    *  returns true if the two given elements' bounding boxes visually overlap
    **/
    function overlaps(elemA, elemB){
        var _pointIsInRect = function(x, y, rect){
            return (rect.left <= x && x <= rect.right && 
                    rect.top <= y && y <= rect.bottom);
        };
        
        // coords relative to document
        var rectA = getRect(elemA);
        var rectB = getRect(elemB);
        
        // checks if any corner of one rect is contained in the other rect
        var _cornersOverlapBox = function(rectA, rectB){
            return (_pointIsInRect(rectA.left, rectA.top, rectB) || 
                    _pointIsInRect(rectA.right, rectA.top, rectB) || 
                    _pointIsInRect(rectA.right, rectA.bottom, rectB) || 
                    _pointIsInRect(rectA.left, rectA.bottom, rectB));
        };
       
        // checks for cross intersections
        var _isCrossIntersect = function(rectA, rectB){
            return (rectA.top <= rectB.top && 
                    rectB.bottom <= rectA.bottom &&
                    rectB.left <= rectA.left && 
                    rectA.right <= rectB.right);
        };
       
        return (_cornersOverlapBox(rectA, rectB) ||
                _cornersOverlapBox(rectB, rectA) ||
                _isCrossIntersect(rectA, rectB) || 
                _isCrossIntersect(rectB, rectA)); 
    }
    
    
    /** getRotationDims: (number, number, number) => {}
    *
    * returns the height and width of the given dimensions rotated by the
    * given number of degrees
    * see: http://stackoverflow.com/a/9793197 for base inspiration of calc
    **/
    function getRotationDims(width, height, degrees){
        var radians = degrees * (Math.PI / 180);
        
        var rotatedHeight = width * Math.sin(radians) + 
                            height * Math.cos(radians);
        var rotatedWidth = width * Math.cos(radians) + 
                           height * Math.sin(radians);
        return {
            "height": rotatedHeight,
            "width": rotatedWidth
        };
    }
    
    
    /** constrainNum: (number, number, number) => number
    *   
    * simple utility function to constrain a given number to the given range
    **/
    function constrainNum(num, min, max){
        var output = num;
        output = (min !== undefined) ? Math.max(min, output) : output;
        output = (max !== undefined) ? Math.min(max, output) : output;
        return output;
    }    
    
    function _pickBestTooltipOrient(tooltip, validPositionDataList){
        var context = tooltip.parentNode;
        var contextWidth = context.scrollWidth;
        var contextHeight = context.scrollHeight;

        // first, partition data into two categories: those that leave the
        // context's boundaries and those who don't
        var inContextData = [];
        var notInContextData = [];
        for(var i = 0; i < validPositionDataList.length; i++){
            var data = validPositionDataList[i];
            var rect = data.rect;
            if(rect.left < 0 || rect.top < 0 || 
               rect.right > contextWidth || rect.bottom > contextHeight)
            {
                notInContextData.push(data);
            }
            else{
                inContextData.push(data);
            }
        }
        
        var filterDataList = (inContextData.length > 0) ? inContextData :
                                                             notInContextData;
        // TODO: pick the position with the least tooltip offset from the 
        // target
        // for now, just pick the first one that is filtered
        return (filterDataList.length > 0) ? filterDataList[0].orient : null;
    }

    // return the coordinates of the target element, relative to the given 
    // context element (ie: within the context element's offsetParent 
    // coordinate system)
    function _getCoordsRelativeToContext(targetElem, contextElem, contextScale){
        // coordinates of the target element, relative to the document
        var targetPageCoords = getRect(targetElem);
        
        // coordinates of the context element, rel to the document
        var contextPageCoords = getRect(contextElem);

        // coordinates of the target element, relative to context element
        // remember to subtract client top/left (ie border size) in order to 
        // account for fact that 0,0 coordinate for position is top left of
        // content area EXCLUDING border 
        contextScale = (contextScale) ? contextScale : 
                                      getScale(contextElem, contextPageCoords); 
        var borderTop = contextElem.clientTop * contextScale.y;
        var borderLeft = contextElem.clientLeft * contextScale.x;
        var scrollTop = contextElem.scrollTop * contextScale.y;
        var scrollLeft = contextElem.scrollLeft * contextScale.x;
        var targetContextCoords = {
            "top": targetPageCoords.top - contextPageCoords.top - borderTop,
            "left": targetPageCoords.left - contextPageCoords.left - borderLeft
        };
        
        // add in scroll offset if the context is not the body 
        // (we don't add scroll if the context is the body because our 
        //  getRect calculations were already in relation to the body)
        if(contextElem !== document.body && 
           hasParentNode(contextElem, document.body))
        {
            targetContextCoords.top += scrollTop;
            targetContextCoords.left += scrollLeft;
        }
        return targetContextCoords;
    }

    function _forceDisplay(elem){
        elem.setAttribute("_force-display", true);
    }

    function _unforceDisplay(elem){
        elem.removeAttribute("_force-display");
    }

    // attempts positioning in all directions
    function _autoPositionTooltip(tooltip, targetElem){
        var arrow = tooltip.xtag.arrowEl;
        // if not given a valid placement, recursively attempt valid placements
        // until getting something that doesn't overlap the target element
        // store information on any valid positionings so that we can
        // check for the best one after we've run through all directions
        var validOrientDataList = [];

        for(var tmpOrient in TIP_ORIENT_ARROW_DIR_MAP){
            // ensure arrow is pointing in correct direction
            arrow.setAttribute("arrow-direction", 
                               TIP_ORIENT_ARROW_DIR_MAP[tmpOrient]);
            // recursively attempt a valid positioning
            var positionRect = _positionTooltip(tooltip, targetElem, 
                                                tmpOrient);
            if(!positionRect){
                continue;
            }

            _forceDisplay(tooltip);
            // found a good position, so save data
            if(!overlaps(tooltip, targetElem)){
                validOrientDataList.push({
                    orient: tmpOrient,
                    rect: positionRect
                });
            }
            _unforceDisplay(tooltip);
        }
        var bestOrient = _pickBestTooltipOrient(tooltip, 
                                                validOrientDataList);
        /* set the _auto-orientation attribute so that CSS animations
         * still apply even though orientation attribute is not
         * one of 'top', 'left', 'bottom', or 'right'
         */
        tooltip.setAttribute("_auto-orientation", bestOrient);

        // ensure arrow is pointing in correct direction
        arrow.setAttribute("arrow-direction", 
                           TIP_ORIENT_ARROW_DIR_MAP[bestOrient]);
        // if best orient exists and isn't what was the last position 
        // attempted, set that position again
        if(isValidOrientation(bestOrient) && bestOrient !== tmpOrient){
            return _positionTooltip(tooltip, targetElem, bestOrient);
        }
        // otherwise return the last rect to be checked
        else{
            return positionRect;
        }
    }

    /** _positionTooltip: (x-tooltip, DOM, string)
     *
     * when called, attempts to reposition the tooltip so that it is centered
     * on and pointing to the target element with the correct orientation
     *
     * if given orientation is not a valid orientation type, this will attempt
     * to autoplace the tooltip in an orientation that doesn't overlap the 
     * targeted elements
     **/
    function _positionTooltip(tooltip, targetElem, orientation, reattemptDepth){
        if((!tooltip.parentNode)){
            tooltip.left = "";
            tooltip.top = "";
            return null;
        }
        reattemptDepth = (reattemptDepth === undefined) ? 0 : reattemptDepth;
        var arrow = tooltip.xtag.arrowEl;

        // if not given a valid placement, recursively attempt valid placements
        // until getting something that doesn't overlap the target element
        if(!(isValidOrientation(orientation))){
            return _autoPositionTooltip(tooltip, targetElem);
        }
        
        var tipContext = (tooltip.offsetParent) ? 
                            tooltip.offsetParent : tooltip.parentNode;
        
        // only position if NOT currently recursing to get a more stable
        // position, or final size will never match up to initial size
        if(!reattemptDepth){
            tooltip.style.top = "";
            tooltip.style.left = "";
            arrow.style.top = "";
            arrow.style.left = "";
        }
                
        _forceDisplay(tooltip);
        var contextRect = getRect(tipContext);   
        var contextScale = getScale(tipContext, contextRect);

        // coordinates of the target element, relative to the tooltip's 
        // context (ie: in the context's coordinate system)
        var targetContextCoords = _getCoordsRelativeToContext(targetElem, 
                                                              tipContext,
                                                              contextScale);

        var contextWidth = tipContext.scrollWidth * contextScale.x;
        var contextHeight = tipContext.scrollHeight * contextScale.y;
        var contextViewWidth = tipContext.clientWidth * contextScale.x;
        var contextViewHeight = tipContext.clientHeight * contextScale.y;

        var targetRect = getRect(targetElem);
        var targetWidth = targetRect.width;
        var targetHeight = targetRect.height;

        var tooltipRect = getRect(tooltip);
        var tooltipScale = getScale(tooltip, tooltipRect);

        var origTooltipWidth = tooltipRect.width;
        var origTooltipHeight = tooltipRect.height;
        // assume we're not css scaling the arrow separately
        var arrowWidth = arrow.offsetWidth * tooltipScale.x;
        var arrowHeight = arrow.offsetHeight * tooltipScale.y;
        
        // TODO: needs more intelligent rotation angle calculation; currently
        // just assumes rotation is 45 degrees
        var arrowRotationDegs = 45;
        var arrowDims = getRotationDims(arrowWidth, arrowHeight, 
                                        arrowRotationDegs);                                
        arrowWidth = arrowDims.width;
        arrowHeight = arrowDims.height;
        
        // coords for if we need to either vertically or horizontally center the
        // tooltip on the target element;
        // coords are relative to the tooltip's context
        var centerAlignCoords = {
            "left": targetContextCoords.left + 
                    ((targetWidth - origTooltipWidth)/2),
            "top": targetContextCoords.top + 
                   ((targetHeight - origTooltipHeight)/2)
        };
        
        // given the final top and left of the tooltip, this helper function
        // will return the top and left coordinates that would allow the tooltip
        // arrow to be horizontally/vertically centered on an element;
        // returned coordinates are relative to the tooltip element
        var _getAlignedArrowCoords = function(tooltipTop, tooltipLeft){
            return {
                "left": (targetWidth - arrowWidth)/2 + 
                        targetContextCoords.left - tooltipLeft,
                "top":  (targetHeight - arrowHeight)/2 + 
                         targetContextCoords.top - tooltipTop
            };
        };
        
        /** messy calculations for aligning the tooltip and the arrow **/
        
        // on first pass, determine the coordinates of the tooltip, as well as 
        // its constraints
        var newTop, newLeft, maxTop, maxLeft;
        if(orientation === "top"){
            arrowHeight /= 2; // remember that the arrow is translated to 
                              // overlap the balloon
            newTop =targetContextCoords.top - origTooltipHeight - arrowHeight;
            newLeft = centerAlignCoords.left;
            maxTop = contextHeight - origTooltipHeight - arrowHeight;
            maxLeft = contextWidth - origTooltipWidth;
        }
        else if(orientation === "bottom"){
            arrowHeight /= 2; //remember that the arrow is translated to overlap
            newTop = targetContextCoords.top + targetHeight + arrowHeight;
            newLeft = centerAlignCoords.left;
            maxTop = contextHeight - origTooltipHeight;
            maxLeft = contextWidth - origTooltipWidth;
        }
        else if(orientation === "left"){
            arrowWidth /= 2; // remember that the arrow is translated to overlap
            newTop = centerAlignCoords.top;
            newLeft =targetContextCoords.left - origTooltipWidth - arrowWidth;
            maxTop = contextHeight - origTooltipHeight;
            maxLeft = contextWidth - origTooltipWidth - arrowWidth;
        }
        else if(orientation === "right"){
            arrowWidth /= 2; // remember that the arrow is translated to overlap
            newTop = centerAlignCoords.top;
            newLeft = targetContextCoords.left + targetWidth + arrowWidth;
            maxTop = contextHeight - origTooltipHeight;
            maxLeft = contextWidth - origTooltipWidth;
        }
        else{
            throw "invalid orientation " + orientation;
        }
        
        // finally, constrain and position the tooltip
        if(tooltip.noOverflow){
            newTop = constrainNum(newTop, 0, maxTop);
            newLeft = constrainNum(newLeft, 0, maxLeft);
        }
        
        // position the arrow in the tooltip to center on the target element
        var arrowCoords = _getAlignedArrowCoords(newTop, newLeft);
        var arrowVal;
        var arrowBaseSize;
        var arrowStyleProp;
        if(orientation === "top" || orientation === "bottom"){
            arrowVal = constrainNum(arrowCoords.left, 0, 
                                    origTooltipWidth - arrowWidth);
            arrowBaseSize = origTooltipWidth;
            arrowStyleProp = "left";
        }
        else{
            arrowVal = constrainNum(arrowCoords.top, 0, 
                                    origTooltipHeight - arrowHeight);
            arrowBaseSize = origTooltipHeight;
            arrowStyleProp = "top";
        }
        var arrowFrac = (arrowBaseSize) ? (arrowVal / arrowBaseSize) : 0;
        arrow.style[arrowStyleProp] = arrowFrac*100 + "%";

        // position tooltip with percentage
       // newLeft += tooltipRenderOffsets.x;
       // newTop += tooltipRenderOffsets.y;
        // calculate percentage in regards to viewport

        var newTopFrac = (contextViewHeight) ? 
                                (newTop / contextViewHeight) : 0;
        var newLeftFrac = (contextViewWidth) ? 
                                (newLeft / contextViewWidth) : 0;
        tooltip.style.top = newTopFrac*100 + "%";
        tooltip.style.left = newLeftFrac*100 + "%";

        // relayout and check the finalized size of the tooltip
        var newTooltipWidth = tooltip.offsetWidth * tooltipScale.x;
        var newTooltipHeight = tooltip.offsetHeight * tooltipScale.y;
        var newContextViewWidth = tipContext.clientWidth * contextScale.x;
        var newContextViewHeight = tipContext.clientHeight * contextScale.y;
        _unforceDisplay(tooltip);

        // if the tooltip changed size, or the context's client viewport changed
        // during tooltip placement (for example, if placing the tooltip
        // causes a new scrollbar to appear), recurse
        // using the same orientation to try to get a more stable placement
        // in this orientation
        var recursionLimit = 1;
        if(reattemptDepth < recursionLimit &&
           (origTooltipWidth !== newTooltipWidth || 
            origTooltipHeight !== newTooltipHeight ||
            contextViewWidth !== newContextViewWidth ||
            contextViewHeight !== newContextViewHeight))
        {
            return _positionTooltip(tooltip, targetElem, orientation, 
                                    reattemptDepth+1);
        }
        else{
            // return bounding rectangle of finalized position
            return {
                "left": newLeft,
                "top": newTop,
                "width": newTooltipWidth,
                "height": newTooltipHeight,
                "right": newLeft + newTooltipWidth,
                "bottom": newTop + newTooltipHeight
            };
        }
    }
    
    
    /** _showTooltip: (x-tooltip, DOM)
     *
     * positions the tooltip on the triggering element (if given) and makes the
     * tooltip visible
     *
     * fires a 'tooltipshown' event
     **/
    function _showTooltip(tooltip, triggerElem){
        if(triggerElem === tooltip){
            console.warn("The tooltip's target element is the tooltip itself!" +
                        " Is this intentional?");
        }

        var arrow = tooltip.xtag.arrowEl;
        if(!arrow.parentNode){
            console.warn("The inner component DOM of the tooltip "+
                        "appears to be missing. Make sure to edit tooltip"+ 
                        " contents through the .contentEl property instead of" +
                        "directly on the x-tooltip to avoid "+
                        "clobbering the component's internals.");
        }
        var targetOrient = tooltip.orientation;

        // fire this when preparation for showing the tooltip is complete
        var _readyToShowFn = function(){
            _unforceDisplay(tooltip);
            tooltip.setAttribute("visible", true);
            
            xtag.fireEvent(tooltip, "tooltipshown", {
                "triggerElem": triggerElem
            });
        };
        
        if(triggerElem){
            _positionTooltip(tooltip, triggerElem, targetOrient);
            tooltip.xtag.lastTargetElem = triggerElem;
            
            _readyToShowFn();
        }
        else{
            tooltip.style.top = "";
            tooltip.style.left = "";
            arrow.style.top = "";
            arrow.style.left = "";
            _readyToShowFn();
        }
    }
    
    
    /** _hideTooltip: (x-tooltip) 
     *
     * as expected, simply hides/cleans up the tooltip
     *
     * fires a 'tooltiphidden' event
     **/
    function _hideTooltip(tooltip){
        // remove remnant attribute used for auto placement animations
        if(isValidOrientation(tooltip.orientation)){
            tooltip.removeAttribute("_auto-orientation");
        }
        
        if(tooltip.hasAttribute("visible")){
            // force display until transition is done to allow fade out 
            // animation
            _forceDisplay(tooltip)
            tooltip.xtag._hideTransitionFlag = true;
            tooltip.removeAttribute("visible");
        }
    }
    
    function _destroyListeners(tooltip){
        var cachedListeners = tooltip.xtag.cachedListeners;
        cachedListeners.forEach(function(cachedListener){
            cachedListener.removeListener();
        });
        tooltip.xtag.cachedListeners = [];
        OUTER_TRIGGER_MANAGER.unregisterTooltip(tooltip.triggerStyle, tooltip);
    }
    
    /** _updateTriggerListeners: (x-tooltip, string, string)
     *
     * unbinds existing cached listeners and binds new listeners for new trigger 
     * parameters; call this anytime the tooltip trigger changes
     * if newTargetSelector is not given, uses previously existing selector
     * if newTriggerStyle is not given, uses the previously used trigger style
    **/
    function _updateTriggerListeners(tooltip, newTargetSelector, 
                                     newTriggerStyle)
    {
        // dont update listeners if tooltip is not yet actually in the document
        if(!tooltip.parentNode){
            return;
        }
    
        if(newTargetSelector === undefined || newTargetSelector === null){
            newTargetSelector = tooltip.targetSelector;
        }
        if(newTriggerStyle === undefined || newTriggerStyle === null){
            newTriggerStyle = tooltip.triggerStyle;
        }
        
        var newTriggerElems = _selectorToElems(tooltip, newTargetSelector);
        // if we are actually changing the triggering elements, but are losing
        // our last target elem, default to first one in the list
        if(newTriggerElems.indexOf(tooltip.xtag.lastTargetElem) === -1){
            tooltip.xtag.lastTargetElem = (newTriggerElems.length > 0) ? 
                                           newTriggerElems[0] : null; 
            // reposition tooltip
            _positionTooltip(tooltip, tooltip.xtag.lastTargetElem, 
                             tooltip.orientation);
        }
        
        // remove all active cached listeners
        _destroyListeners(tooltip);
        
        // get new event listeners that we'll need to attach
        var listeners;
        if(newTriggerStyle in PRESET_STYLE_LISTENERFNS){
            var getListenersFn = PRESET_STYLE_LISTENERFNS[newTriggerStyle];
            listeners = getListenersFn(tooltip, newTargetSelector);
        }
        else{
            listeners = mkGenericListeners(tooltip, newTargetSelector, 
                                           newTriggerStyle);
            OUTER_TRIGGER_MANAGER.registerTooltip(newTriggerStyle, tooltip);
        }
        // actually attach the listener functions
        listeners.forEach(function(listener){
            listener.attachListener();
        });
        tooltip.xtag.cachedListeners = listeners;
        
        // also hide the tooltip since the trigger has changed
        _hideTooltip(tooltip);
    }
    
    
    xtag.register("x-tooltip", {
        lifecycle:{
            created: function(){
                var self = this;
                // create content elements (allows user to style separately)
                self.xtag.contentEl = document.createElement("div");
                self.xtag.arrowEl = document.createElement("span");
                
                xtag.addClass(self.xtag.contentEl, "tooltip-content");
                xtag.addClass(self.xtag.arrowEl, "tooltip-arrow");
                
                // remove content and put into the content
                self.xtag.contentEl.innerHTML = self.innerHTML;
                self.innerHTML = "";
                
                self.appendChild(self.xtag.contentEl);
                self.appendChild(self.xtag.arrowEl);
                
                
                // default trigger variables
                self.xtag._orientation = "auto";
                self.xtag._targetSelector = PREV_SIB_SELECTOR;
                self.xtag._triggerStyle = "hover";
                // remember who the last element that triggered the tip was
                // (ie: who we should be pointing to if suddenly told to show
                //  outside of a trigger style)
                var triggeringElems = _selectorToElems(
                                         self, self.xtag._targetSelector
                                      );
                self.xtag.lastTargetElem = (triggeringElems.length > 0) ? 
                                            triggeringElems[0] : null; 
                
                // remember what event listeners are still active
                self.xtag.cachedListeners = [];

                // flag variable to indicate whether transitionend listener
                // should do anything
                self.xtag._hideTransitionFlag = false;
                // flag variable for if we should ignore an outer click hide
                // trigger (used when clicking on a tooltip's target to prevent
                // outer click from catching it as well)
                self.xtag._skipOuterClick = false;
            },
            inserted: function(){
                _updateTriggerListeners(this, this.xtag._targetSelector, 
                                        this.xtag._triggerStyle);
            },
            removed: function(){
                _destroyListeners(this);
            }
        },
        events: {
            // tooltipshown and tooltiphidden are fired manually
            "transitionend": function(e){
                var tooltip = e.currentTarget;

                if(tooltip.xtag._hideTransitionFlag && 
                   !tooltip.hasAttribute("visible"))
                {
                    tooltip.xtag._hideTransitionFlag = false;
                    xtag.fireEvent(tooltip, "tooltiphidden");
                }
                // in any case, avoid having a forced display linger around
                _unforceDisplay(tooltip);
            }
        },
        accessors: {
            // sets the placement of the tooltip in relation to a target element
            "orientation":{
                attribute: {},
                get: function(){
                    return this.xtag._orientation;
                },
                // when orientation of tooltip is set, also set direction of 
                // arrow pointer
                set: function(newOrientation){
                    newOrientation = newOrientation.toLowerCase();
                    var arrow = this.querySelector(".tooltip-arrow");
                    
                    var newArrowDir = null;
                    if(isValidOrientation(newOrientation)){
                        newArrowDir = TIP_ORIENT_ARROW_DIR_MAP[newOrientation];
                        arrow.setAttribute("arrow-direction", newArrowDir);
                        this.removeAttribute("_auto-orientation");
                    }
                    else{
                        // when auto placing, we will determine arrow direction
                        // when shown
                        arrow.removeAttribute("arrow-direction");
                    }
                    
                    this.xtag._orientation = newOrientation;
                    
                    this.refreshPosition();
                }
            },
            
            // selects the style of tooltip trigger to use
            // can choose from presets or set to "custom" in order to define
            // custom trigger
            "triggerStyle": {
                attribute: {name: "trigger-style"},
                get: function(){
                    return this.xtag._triggerStyle;
                },
                set: function(newTriggerStyle){
                    _updateTriggerListeners(this, this.targetSelector, 
                                            newTriggerStyle);
                    this.xtag._triggerStyle = newTriggerStyle;
                }
            },
            
            // selector must be in relation to parent node of the tooltip
            // ie: can only select tooltip's siblings or deeper in the DOM tree
            "targetSelector": {
                attribute: {name: "target-selector"},
                get: function(){
                    return this.xtag._targetSelector;
                },
                set: function(newSelector){
                    // filter out selected elements that are 
                    // themselves in the tooltip
                    var newTriggerElems = _selectorToElems(this, newSelector);
                    
                    _updateTriggerListeners(this, newSelector, 
                                            this.triggerStyle);
                    this.xtag._targetSelector = newSelector;
                }
            },
            
            // if set, clicking/triggering events outside of the tooltip or
            // its targeted elements will not dismiss the tooltip
            "ignoreOuterTrigger":{
                attribute: {
                    boolean: true, 
                    name: "ignore-outer-trigger"
                }
            },
            
            // if set, pointer events will not be captured by the tooltip
            "ignoreTooltipPointerEvents":{
                attribute: {
                    boolean: true, 
                    name: "ignore-tooltip-pointer-events"
                }
            },

            "noOverflow":{
                attribute: {
                    boolean: true,
                    name: "no-overflow"
                },
                set: function(noOverflow){
                    this.refreshPosition();
                }
            },
            
            // the DOM element representing the content of the tooltip
            "contentEl": {
                get: function(){
                    return this.xtag.contentEl;
                },
                // can use this to replace the DOM outright
                set: function(newContentElem){
                    var oldContent = this.xtag.contentEl;
                    
                    xtag.addClass(newContentElem, "tooltip-content");
                    
                    this.replaceChild(newContentElem, oldContent);
                    this.xtag.contentEl = newContentElem;
                    
                    this.refreshPosition();
                }
            },
            
            // return a list of the preset trigger style names
            "presetTriggerStyles": {
                get: function(){
                    var output = [];
                    for(var presetName in PRESET_STYLE_LISTENERFNS){
                        output.push(presetName);
                    }
                    return output;
                }
            },
            
            // return a list of elements currently selected by the tooltip's
            // selector
            "targetElems":{
                get: function(){
                    return _selectorToElems(this, this.targetSelector);
                }
            }
        },
        methods: {
            // called when the position of the tooltip needs to be manually
            // recalculated; such as after updating the DOM of the contents
            refreshPosition: function(){
                if(this.xtag.lastTargetElem){
                    _positionTooltip(this, this.xtag.lastTargetElem,
                                     this.orientation);
                }
            },
            
            // exactly as you'd expect; shows the tooltip
            show: function(){
                _showTooltip(this, this.xtag.lastTargetElem);
            },
            
            // exactly as you'd expect; hides the tooltip
            hide: function(){
                _hideTooltip(this);
            },
            
            // exactly as you'd expect; toggles between showing and hiding the
            // tooltip
            toggle: function(){
                if(this.hasAttribute("visible")){
                    this.hide();
                }
                else{
                    this.show();
                }
            }
        }
    });
})();