(function(){
    // used in mouse events
    var LEFT_MOUSE_BTN = 0;

    // used during creating calendar elements
    var GET_DEFAULT_LABELS = function(){
        return {
            prev: '<',
            next: '>',
            months: ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                     'August', 'September', 'October', 'November', 'December'],
            weekdays: ['Sun', "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        };
    };

    /** returns the given date, but as a Date object representing that date
        without local/timezone information

        ***IMPORTANT*** call this anytime we create a new Date(), in order to 
        ensure avoid oddities caused by mixing and matching timezone offsets
    **/
    function toUTCDate(localDate){
        // don't try to reconvert a date already set to UTC time, or
        // the inherent timezone information of JS Dates may change an already
        // converted date
        if(localDate.getUTCHours() === 0 &&
           localDate.getUTCMinutes() === 0 &&
           localDate.getUTCSeconds() === 0 &&
           localDate.getUTCMilliseconds() === 0)
        {
            return new Date(localDate.valueOf());
        }
        else{
            var utcDate = new Date();
            utcDate.setUTCDate(localDate.getDate());
            utcDate.setUTCMonth(localDate.getMonth());
            utcDate.setUTCFullYear(localDate.getFullYear());
            utcDate.setUTCHours(0);
            utcDate.setUTCMinutes(0);
            utcDate.setUTCSeconds(0);
            utcDate.setUTCMilliseconds(0);
            return utcDate;
        }
    }

    // the current date, set to midnight UTC time
    var TODAY = toUTCDate(new Date());

    // constants used in tracking the type of the current drag/paint operation 
    var DRAG_ADD = "add";
    var DRAG_REMOVE = "remove";

    // constant representing the class of a day that has been 
    // chosen/toggled/selected/whatever
    var CHOSEN_CLASS = "chosen";

    // minifier-friendly strings
    var className = 'className';

    // dom helpers

    // minification wrapper for appendChild
    function appendChild(parent, child) {
        parent.appendChild(child);
    }

    // wrapper for parseInt(*, 10) to make jshint happy about radix params
    // also minification-friendly
    function parseIntDec(num){
        return parseInt(num, 10);
    }

    /** isWeekdayNum: (*) => Boolean

    Checks if the given parameter is a valid weekday number 0-6 
    (0=Sunday, 1=Monday, etc)
    **/
    function isWeekdayNum(dayNum){
        var dayInt = parseIntDec(dayNum);
        return (dayInt === dayNum && (!isNaN(dayInt)) && 
                dayInt >= 0 && dayInt <= 6);
    }

    /** isValidDateObj: (*) => Boolean

    simply checks if the given parameter is a valid date object
    **/
    function isValidDateObj(d) {
        return (d instanceof Date)  && !!(d.getTime) && !isNaN(d.getTime());
    }

    /** isArray: (*) => Boolean

    simply checks if the given parameter is an array
    **/
    function isArray(a){
        if(a && a.isArray){
            return a.isArray();
        }
        else{
            return Object.prototype.toString.call(a) === "[object Array]";
        }
    }

    /** makeEl: String => DOM Element

    Takes a string in the format of "tag.classname.classname2" (etc) and
    returns a DOM element of that type with the given classes

    For example, makeEl('div.foo') returns the Node <div class="foo">
    **/
    function makeEl(s) {
        var a = s.split('.');
        var tag = a.shift();
        var el = document.createElement(tag);
        el[className] = a.join(' ');
        return el;
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

    /** addClass: (DOM element, string)

    minification-friendly wrapper of xtag.addClass
    **/
    function addClass(el, c) {
        xtag.addClass(el, c);
    }

    /** removeClass: (DOM element, string)

    minification-friendly wrapper of xtag.removeClass
    **/
    function removeClass(el, c) {
        xtag.removeClass(el, c);
    }

    /** hasClass: (DOM element, string)

    minification-friendly wrapper of xtag.hasClass
    **/
    function hasClass(el, c) {
        return xtag.hasClass(el, c);
    }

    // Date utils

    function getYear(d) {
        return d.getUTCFullYear();
    }
    function getMonth(d) {
        return d.getUTCMonth();
    }
    function getDate(d) {
        return d.getUTCDate();
    }
    function getDay(d){
        return d.getUTCDay();
    }

    /** pad: (Number, Number) => String
    
    Pads a number with preceding zeros to be padSize digits long

    If given a number with more than padSize digits, truncates the leftmost
    digits to get to a padSize length
    **/
    function pad(n, padSize) {
        var str = n.toString();
        var padZeros = (new Array(padSize)).join('0');
        return (padZeros + str).substr(-padSize);
    }

    /** iso: Date => String 

    returns the ISO format representation of a date ("YYYY-MM-DD")
    **/
    function iso(d) {
        return [pad(getYear(d), 4),
                pad(getMonth(d)+1, 2),
                pad(getDate(d), 2)].join('-');
    }

    /** fromIso: String => Date/null

    Given a string, attempts to parse out a date in YYYY-MM-DD format

    If successful, returns the corresponding Date object, otherwise return null
    **/
    var ISO_DATE_REGEX = /(\d{4})[^\d]?(\d{2})[^\d]?(\d{2})/;
    function fromIso(s){
        if (isValidDateObj(s)) return s;
        var d = ISO_DATE_REGEX.exec(s);
        if (d) {
          return toUTCDate(new Date(d[1],d[2]-1,d[3]));
        }
        else{
            return null;
        }
    }

    /** parseSingleDate: String => Date/null

    attempts to parse out the given string as a Date

    If successful, returns the corresponding Date object, otherwise return null

    Valid input formats include any format with a YYYY-MM-DD format or 
    is parseable by Date.parse
    **/
    function parseSingleDate(dateStr){
        if(isValidDateObj(dateStr)) return dateStr;

        // cross-browser check for ISO format that is not 
        // supported by Date.parse without implicit time zone
        var isoParsed = fromIso(dateStr);
        if(isoParsed){
            return isoParsed;
        }
        else{
            var parsedMs = Date.parse(dateStr);
            if(!isNaN(parsedMs)){
                return toUTCDate(new Date(parsedMs));
            }
            return null;
        }
    }


    /** parseMultiDates: Array/String => (Date/[Date, Date]) array/null
    
    Given either an array or a JSON string, attempts to parse out the input into
    the given array format:
     - An array whose elements fall into one of the following two formats
        - A Date object representing a single day
          (if the input uses a string instead, this parser will attempt to 
           parseSingleDate it)
        - A two element list of Date objects representing the start and
          end dates of a range (if the inputs use strings instead, the parser
          will attempt to parseSingleDate them)

    If the input is parseable into this format, return the resulting 2d array
    Otherwise, return null and console.warn the parsing error

    If given an array that already follows this format, will simply return it
    **/
    function parseMultiDates(multiDateStr){
        var ranges;
        if(isArray(multiDateStr)){
            ranges = multiDateStr.slice(0); // so that this is nondestructive
        }
        else if(isValidDateObj(multiDateStr)){
            return [multiDateStr];
        }
        else if(typeof(multiDateStr) === "string" && multiDateStr.length > 0){
            // check if this is a JSON representing a range of dates
            try{
                ranges = JSON.parse(multiDateStr);
                if(!isArray(ranges)){
                    console.warn("invalid list of ranges", multiDateStr);
                    return null;
                }
            }
            catch(err){
                // check for if this represents a single date
                var parsedSingle = parseSingleDate(multiDateStr);
                if(parsedSingle){
                    return [parsedSingle];
                }
                else{
                    console.warn("unable to parse", multiDateStr, 
                                "as JSON or single date");
                    return null;
                }
            }
        }
        else{
            return null;
        }

        // go through and replace each unparsed range with its parsed
        // version (either a singular Date object or a two-item list of
        // a start Date and an end Date)
        for(var i = 0; i < ranges.length; i++){
            var range = ranges[i];

            if(isValidDateObj(range)){
                continue;
            }
            // parse out as single date
            else if(typeof(range) === "string"){
                var parsedDate = parseSingleDate(range);
                if(!parsedDate){
                    console.warn("unable to parse date", range);
                    return null;
                }
                ranges[i] = parsedDate;
            }
            // parse out as 2-item list/range of start/end date
            else if(isArray(range) && range.length === 2){
                var parsedStartDate = parseSingleDate(range[0]);

                if(!parsedStartDate){
                    console.warn("unable to parse start date", range[0], 
                                "from range", range);
                    return null;
                }

                var parsedEndDate = parseSingleDate(range[1]);
                if(!parsedEndDate){
                    console.warn("unable to parse end date", range[1], 
                                "from range", range);
                    return null;
                }

                if(parsedStartDate.valueOf() > parsedEndDate.valueOf()){
                    console.warn("invalid range", range, 
                                ": start date is after end date");
                    return null;
                }
                ranges[i] = [parsedStartDate, parsedEndDate];
            }
            else{
                console.warn("invalid range value: ", range);
                return null;
            }
        }
        return ranges;
    }

    /* from: (Date, number, number, number) => Date

    Create a new date based on the provided date, but with any given 
    year/month/date parameters in place of the base date's
    */
    function from(base, y, m, d) {
        if (y === undefined) y = getYear(base);
        if (m === undefined) m = getMonth(base);
        if (d === undefined) d = getDate(base);
        return toUTCDate(new Date(y,m,d));
    }

    /* relOffset: (Date, number, number. number) => Date

    get the date with the given offsets from the base date

    ex: relOffset(foo, 0, -1, 0) returns the date that is exactly one month
        behind foo
    */
    function relOffset(base, y, m, d) {
        return from(base,
                    getYear(base) + y,
                    getMonth(base) + m,
                    getDate(base) + d);
    }

    /** findWeekStart: Date => Date

    Find the date that is the beginning of the given date's week.

    This defaults to finding the nearest Sunday before or on the given date,
    but if firstWeekday is given as a number 0-6 (0=Sunday, 1=Monday, etc),
    that day will be used instead
    **/
    function findWeekStart(d, firstWeekday) {
        firstWeekday = parseIntDec(firstWeekday);
        if(!isWeekdayNum(firstWeekday)){
            firstWeekday = 0;
        }

        for(var step=0; step < 7; step++){
            if(getDay(d) === firstWeekday){
                return d;
            }
            else{
                d = prevDay(d);
            }
        }
        throw "unable to find week start";
    }

    /** findWeekEnd: Date => Date

    Find the date that is the beginning of the given date's week.

    This defaults to finding the nearest Saturday after or on the given date,
    but if lastWeekday is given as a number 0-6 (0=Sunday, 1=Monday, etc),
    that day will be used instead
    **/
    function findWeekEnd(d, lastWeekDay){
        lastWeekDay = parseIntDec(lastWeekDay);
        if(!isWeekdayNum(lastWeekDay)){
            lastWeekDay = 6;
        }

        for(var step=0; step < 7; step++){
            if(getDay(d) === lastWeekDay){
                return d;
            }
            else{
                d = nextDay(d);
            }
        }
        throw "unable to find week end";
    }

    /** findFirst: Date => Date

    Find the first day of the date's month.
    **/
    function findFirst(d) {
        d = new Date(d.valueOf());
        d.setUTCDate(1);
        return toUTCDate(d);
    }

    /** findLast: Date => Date

    Find the last day of the date's month.
    **/
    function findLast(d){
        return prevDay(relOffset(d, 0, 1, 0));
    }

    /** nextDay: Date => Date

    Return the day that comes after the given date's
    **/
    function nextDay(d) {
        return relOffset(d, 0, 0, 1);
    }

    /** prevDay: Date => Date

    Return the day that comes before the given date's
    **/
    function prevDay(d) {
        return relOffset(d, 0, 0, -1);
    }

    /** dateMatches: (Date, (Date/[Date, Date]) array) => Boolean

    Check whether Date `d` is in the list of Date/Date ranges in `matches`.

    If given a single date to check, will check if the two dates fall on the 
    same date

    If given an array of Dates/2-item Dateranges (ie: the same format returned 
    by parseMultipleDates and used for Calendar._chosenRanges)

    params:
        d                   the date to compare
        matches             if given as a singular date, will check if d is
                            in the same date
                            Otherwise, 
    **/
    function dateMatches(d, matches) {
        if (!matches) return;
        matches = (matches.length === undefined) ? [matches] : matches;
        var foundMatch = false;
        matches.forEach(function(match) {
          if (match.length === 2) {
            if (dateInRange(match[0], match[1], d)) {
              foundMatch = true;
            }
          } else {
            if (iso(match) === iso(d)) {
              foundMatch = true;
            }
          }
        });
        return foundMatch;
    }

    /** dateInRange: (Date, Date, Date) => Boolean

    returns true if the date of the given d date (without time information)
    is in between the start and end days
    **/
    function dateInRange(start, end, d) {
        // convert to strings for easier comparison
        return iso(start) <= iso(d) && iso(d) <= iso(end);
    }


    /** sortRanges: (Date/[Date, Date]) array

    given a list of singular dates / 2-item date range lists (ie: the
    same format as returned by parseMultipleDates and used by 
    Calendar._chosenRanges), destructively sorts the list to have
    earlier dates come first
    **/
    function sortRanges(ranges){
        ranges.sort(function(rangeA, rangeB){
            var dateA = (isValidDateObj(rangeA)) ? rangeA : rangeA[0];
            var dateB = (isValidDateObj(rangeB)) ? rangeB : rangeB[0];
            return dateA.valueOf() - dateB.valueOf();
        });
    }

    /** makeControls: (data map) => DOM element

    creates and returns the HTML element used to hold the 
    navigation controls of the calendar
    **/
    function makeControls(labelData) {
        var controls = makeEl('div.controls');
        var prev = makeEl('span.prev');
        var next = makeEl('span.next');
        prev.innerHTML = labelData.prev;
        next.innerHTML = labelData.next;
        appendChild(controls, prev);
        appendChild(controls, next);
        return controls;
    }


    /** Calendar: datamap

    A representation of the currently displayed calendar's attributes

    Initialized with an optional data map containing any of the following:

     -  "span"  :       The number of months to display at once
                        (default = 1)
    -  "multiple"  :    Whether or not multiple dates are allowed to be chosen
                        at once
                        (default = false)
    -   "view"  :       The cursor date to center the calendar display on 
                        For example, a view of Dec 2013 and span 3 will show
                        a calendar encompassing Nov 2013, Dec 2013, and Jan 2014
                        (default = the first date given in data.chosen, or
                                   the current date if data.chosen is 
                                   unavailable)
    -   "chosen"  :     A Date/[Date, Date] array, similar to the format of 
                        parseMultipleDates' return value
                        Elements consist of both singular Dates and 2-element
                        arrays of Dates representing the start and end dates
                        of a date range
                        (default: [data.view], or [], 
                                  if data.view is unavailable)
    - "firstWeekdayNum" :  A number 0-6 (where 0=Sunday, 1=Monday, etc) 
                           indicating which day should be used as the start of
                           any given week 
                           (this is useful for regions whose weeks start with
                            Monday instead of Sunday)
    **/
    function Calendar(data) {
        // reassign this to minification friendly variable
        var self = this;
        data = data || {};
        self._span = data.span || 1;
        self._multiple = data.multiple || false;
        // initialize private vars
        self._viewDate = self._getSanitizedViewDate(data.view, data.chosen);
        self._chosenRanges = self._getSanitizedChosenRanges(data.chosen, 
                                                                data.view);
        self._firstWeekdayNum = data.firstWeekdayNum || 0;

        // Note that self._el is the .calendar child div, 
        // NOT the x-calendar itself
        self._el = makeEl('div.calendar'); 
        self._labels = GET_DEFAULT_LABELS();

        self._customRenderFn = null;
        self._renderRecursionFlag = false;

        self.render(true);
    }
    // minification friendly variable for Calendar.prototype
    var CALENDAR_PROTOTYPE = Calendar.prototype;

    /** makeMonth: (Date) => DOM element

    For the given view/cursor date's month, creates the HTML DOM elements 
    needed to represent this month in the calendar

    Days are created with a data-date attribute containing the ISO string
    representing their date

    For any date that is contained by the given chosen ranges, sets 'chosen'
    classes so that they are marked as chosen for styling

    Also marks the current date with the 'today' class

    params:
        d               the date whose month we will be rendering
    **/
    CALENDAR_PROTOTYPE.makeMonth = function(d) {
        if (!isValidDateObj(d)) throw 'Invalid view date!';
        var firstWeekday = this.firstWeekdayNum;
        var chosen = this.chosen;
        var labels = this.labels;

        var month = getMonth(d);
        var sDate = findWeekStart(findFirst(d), firstWeekday);

        var monthEl = makeEl('div.month');
        // create month label
        var monthLabel = makeEl('div.month-label');
        monthLabel.textContent = labels.months[month] + ' ' + getYear(d);

        appendChild(monthEl, monthLabel);

        // create the weekday labels
        var weekdayLabels = makeEl('div.weekday-labels');
        for(var step = 0; step < 7; step++){
            var weekdayNum = (firstWeekday + step)  % 7;
            var weekdayLabel = makeEl('span.weekday-label');
            weekdayLabel.textContent = labels.weekdays[weekdayNum];
            appendChild(weekdayLabels, weekdayLabel);
        }
        appendChild(monthEl, weekdayLabels);


        // create each week of days in the month
        var week = makeEl('div.week');
        var cDate = sDate;
        var maxDays = 7 * 6; // maximum is 6 weeks displayed at once

        for(var step=0; step < maxDays; step++){
          var day = makeEl('span.day');
          day.setAttribute('data-date', iso(cDate));
          day.textContent = getDate(cDate);

          if (getMonth(cDate) !== month) {
            addClass(day, 'badmonth');
          }

          if (dateMatches(cDate, chosen)) {
            addClass(day, CHOSEN_CLASS);
          }

          if(dateMatches(cDate, TODAY)){
            addClass(day, "today");
          }

          appendChild(week, day);
          var oldDate = cDate;
          cDate = nextDay(cDate);
          // if the next day starts a new week, append finished week and see if
          // we are done drawing the month
          if ((step+1) % 7 === 0) {
            appendChild(monthEl, week);
            week = makeEl('div.week');
            // Are we finished drawing the month?
            // Checks month rollover and year rollover
            // (ie: if month or year are after the current ones)
            var done = (getMonth(cDate) > month || 
                        (getMonth(cDate) < month && 
                         getYear(cDate) > getYear(sDate))
                       );
            if(done) break;
          }
        }
        return monthEl;
    }


    /** Calendar._getSanitizedViewDate: 
                (Date, (Date/[Date,Date]) array / Date) => Date

    given a view Date and an optional chosen range list or chosen date, 
    return the Date to use as the view, depending on what information is given

    returns the given view if valid

    otherwise, return the given chosenDate, if it is a single date, or
    the first date in the range, if it is a date/daterange array

    otherwise default to the current date

    params:
        viewDate                    the proposed view date to sanitize
        chosenRanges                (optional) either a single date or a 
                                    list of Date/[Date,Date]  ranges
                                    (defaults to this.chosen)
    **/
    CALENDAR_PROTOTYPE._getSanitizedViewDate = function(viewDate, 
                                                        chosenRanges)
    {
        chosenRanges = (chosenRanges === undefined) ? 
                            this.chosen : chosenRanges;
        var saneDate;
        // if given a valid viewDate, return it
        if(isValidDateObj(viewDate)){
           saneDate = viewDate;
        }
        // otherwise if given a single date for chosenRanges, use it
        else if(isValidDateObj(chosenRanges)){
            saneDate = chosenRanges;
        }
        // otherwise, if given a valid chosenRanges, return the first date in
        // the range as the view date
        else if(isArray(chosenRanges) && chosenRanges.length > 0){
            var firstRange = chosenRanges[0];
            if(isValidDateObj(firstRange)){
                saneDate = firstRange;
            }
            else{
                saneDate = firstRange[0];
            }
        }
        // if not given a valid viewDate or chosenRanges, return the current
        // day as the view date
        else{
            saneDate = TODAY;
        }
        return saneDate;
    };

    /** _collapseRanges: (Date/[Date,Date]) array => (Date/[Date,Date]) array

    given a list of dates/dateranges, nondestructively sort by ascending date, 
    then collapse/merge any consecutive dates into date ranges and return the
    resulting list
    **/
    function _collapseRanges(ranges){
        ranges = ranges.slice(0); // nondestructive sort
        sortRanges(ranges);

        var collapsed = [];
        for(var i = 0; i < ranges.length; i++){
            var currRange = ranges[i];
            var prevRange = (collapsed.length > 0) ? 
                              collapsed[collapsed.length-1] : null;

            var currStart, currEnd;
            var prevStart, prevEnd;

            if(isValidDateObj(currRange)){
                currStart = currEnd = currRange;
            }
            else{
                currStart = currRange[0];
                currEnd = currRange[1];
            }
            // collapse extraneous range into a singular date
            currRange = (dateMatches(currStart, currEnd)) ? 
                             currStart : [currStart, currEnd];

            if(isValidDateObj(prevRange)){
                prevStart = prevEnd = prevRange;
            }
            else if(prevRange){
                prevStart = prevRange[0];
                prevEnd = prevRange[1];
            }
            else{
                // if no previous range, just add the current range to the list
                collapsed.push(currRange);
                continue;
            }

            // if we should collapse range, merge with previous range
            if(dateMatches(currStart, [prevRange]) || 
               dateMatches(prevDay(currStart), [prevRange]))
            {
                var minStart = (prevStart.valueOf() < currStart.valueOf()) ? 
                                                          prevStart : currStart;
                var maxEnd = (prevEnd.valueOf() > currEnd.valueOf()) ? 
                                                          prevEnd : currEnd;

                var newRange = (dateMatches(minStart, maxEnd)) ? 
                                                minStart : [minStart, maxEnd];
                collapsed[collapsed.length-1] = newRange;
            }
            // if we don't collapse, just add to list
            else{
                collapsed.push(currRange);
            }
        }
        return collapsed;
    }


    /** Calendar._getSanitizedChosenRanges: 
            ((Date/[Date,Date]) array, Date) => (Date/[Date,Date]) array

    given a chosen range list or chosen date and an optional view date
    return the range list as the chosen date range, 
    depending on what information is given

    if chosenrange is given as a valid date, return it as a singleton list
    if chosenrange is given as a valid date/daterange list, return it

    otherwise, return the given view date in a singleton list, or an empty list
    if the view is invalid or chosen is specifically set to nothing

    params:
        chosenRanges                either a single date or a list of 
                                    Date/[Date,Date] ranges to sanitize
                                    if set to null or undefined, this is 
                                    interpreted as an empty list

        viewDate                    (optional) the current cursor date
                                    (default = this.view)
    **/        
    CALENDAR_PROTOTYPE._getSanitizedChosenRanges = function(chosenRanges, 
                                                              viewDate)
    {
        viewDate = (viewDate === undefined) ? this.view : viewDate;

        var cleanRanges;
        if(isValidDateObj(chosenRanges)){
            cleanRanges = [chosenRanges];
        }
        else if(isArray(chosenRanges)){
            cleanRanges = chosenRanges;
        }
        else if(chosenRanges === null || chosenRanges === undefined || 
                !viewDate)
        {
            cleanRanges = [];
        }
        else{
            cleanRanges = [viewDate];
        }

        var collapsedRanges = _collapseRanges(cleanRanges);
        // if multiple is not active, only get the first date of the chosen
        // ranges for the sanitize range list
        if((!this.multiple) && collapsedRanges.length > 0){
            var firstRange = collapsedRanges[0];

            if(isValidDateObj(firstRange)){
                return [firstRange];
            }
            else{
                return [firstRange[0]];
            }
        }
        else{
            return collapsedRanges;
        }
    };


    /** Calendar.addDate: (Date, Boolean)

    if append is falsy/not given, replaces the calendar's chosen ranges with 
    the given date

    if append is truthy, adds the given date to the stored list of date ranges
    **/
    CALENDAR_PROTOTYPE.addDate = function(dateObj, append){
        if(isValidDateObj(dateObj)){
            if(append){
                this.chosen.push(dateObj);
                // trigger setter
                this.chosen = this.chosen;
            }
            else{
                this.chosen = [dateObj];
            }
        }
    };

    /** Calendar.removeDate: (Date)

    removes the given date from the Calendar's stored chosen date ranges
    **/
    CALENDAR_PROTOTYPE.removeDate = function(dateObj){
        if(!isValidDateObj(dateObj)){
            return;
        }
        // search stored chosen ranges for the given date to remove
        var ranges = this.chosen.slice(0);
        for(var i = 0; i < ranges.length; i++){
            var range = ranges[i];
            if(dateMatches(dateObj, [range])){
                // remove the item the date was found in
                ranges.splice(i, 1);

                // if the date was located in a 2-item date range, split the
                // range into separate ranges/dates as needed
                if(isArray(range)){
                    var rangeStart = range[0];
                    var rangeEnd = range[1];
                    var prevDate = prevDay(dateObj);
                    var nextDate = nextDay(dateObj);

                    // if we should keep the preceding section of the range
                    if(dateMatches(prevDate, [range])){
                        ranges.push([rangeStart, prevDate]);
                    }

                    // if we should keep the succeeding section of the range
                    if(dateMatches(nextDate, [range])){
                        ranges.push([nextDate, rangeEnd]);
                    }
                }
                this.chosen = _collapseRanges(ranges);
                break;
            }
        }
    };

    /** Calendar.hasChosenDate: (Date) => Boolean 

    returns true if the given date is one of the dates stored as chosen
    **/
    CALENDAR_PROTOTYPE.hasChosenDate = function(dateObj){
        return dateMatches(dateObj, this._chosenRanges);
    };


    /** Calendar.hasVisibleDate: (Date, Boolean)

    if excludeBadMonths is falsy/not given, return true if the given date is
    at all visible in the calendar element, including the remnants of 
    months visible on the edges of the current span

    if excludeBadMonths is truthy, return true if the given date is contained
    within the current visible span of dates, ignoring those in months not
    actually within the span
    **/
    CALENDAR_PROTOTYPE.hasVisibleDate = function(dateObj, excludeBadMonths){
        var startDate = (excludeBadMonths) ? this.firstVisibleMonth :
                                             this.firstVisibleDate;
        var endDate = (excludeBadMonths) ? findLast(this.lastVisibleMonth) :
                                           this.lastVisibleDate;

        return dateMatches(dateObj, [[startDate, endDate]]);
    };


    /** Calendar.render: (Boolean)

    Updates the DOM nodes stored in the current calendar

    if preserveNodes is falsy/not given, removes all existing nodes and 
    completely recreates the calendar
       - use this when switching calendar displays, such as when changing span
         or using view to switch months
       - NOTE: throwing away nodes during an event handler kills the 
         propagation chain, so account for this
    
    if preserveNodes is truthy, only update the status/classes of the currently
    displayed day nodes

    NOTE: this doesn't update the navigation controls, as they are separate from
    the calendar element
    **/
    CALENDAR_PROTOTYPE.render = function(preserveNodes){
        var span = this._span;
        var i;
        if(!preserveNodes){
            this.el.innerHTML = "";
            // get first month of the span of months centered on the view
            var ref = this.firstVisibleMonth;
            for (i = 0; i < span; i++) {
                appendChild(this.el, this.makeMonth(ref));
                // get next month's date
                ref = relOffset(ref, 0, 1, 0);
            }
        }
        // if we want to maintain the original elements without completely
        // wiping and rewriting nodes (ex: when the visible dates don't change)
        else{
            var days = xtag.query(this.el, ".day");
            var day;
            for(i = 0; i < days.length; i++){
                day = days[i];

                if(!day.hasAttribute("data-date")){
                    continue;
                }

                var dateIso = day.getAttribute("data-date");
                var parsedDate = fromIso(dateIso);
                if(!parsedDate){
                    continue;
                }
                else{
                    if(dateMatches(parsedDate, this._chosenRanges)){
                        addClass(day, CHOSEN_CLASS);
                    } 
                    else{
                        removeClass(day, CHOSEN_CLASS);
                    }

                    if(dateMatches(parsedDate, [TODAY])){
                        addClass(day, "today");
                    }
                    else{
                        removeClass(day, "today");
                    }
                }
            }
        }

        // finally call the custom renderer
        this._callCustomRenderer();
    };

    // call custom renderer on each day, passing in the element, the
    // date, and the iso representation of the date
    CALENDAR_PROTOTYPE._callCustomRenderer = function(){
        if(!this._customRenderFn) return;

        // prevent infinite recursion of custom rendering requiring a rerender
        // of the calendar
        if(this._renderRecursionFlag){
            throw ("Error: customRenderFn causes recursive loop of "+
                   "rendering calendar; make sure your custom rendering "+
                   "function doesn't modify attributes of the x-calendar that "+
                   "would require a re-render!");
        }

        var days = xtag.query(this.el, ".day");
        for (var i = 0; i < days.length; i++) {
            var day = days[i];
            var dateIso = day.getAttribute("data-date");
            var parsedDate = fromIso(dateIso);

            this._renderRecursionFlag = true;
            this._customRenderFn(day, 
                                 (parsedDate) ? parsedDate : null, 
                                 dateIso);
            this._renderRecursionFlag = false;
        }
    };

    Object.defineProperties(CALENDAR_PROTOTYPE, {
        /** Calendar.el: (readonly)

        the DOM element representing the calendar's contianer element

        Note that this is the .calendar child div, NOT the x-calendar itself!

        (Controls are separated in order to prevent the need for constant 
         layout repositioning due to z-indexing)
        **/
        "el": {
            get: function(){
                return this._el;
            }
        },

        /** Calendar.multiple: (read-writeable)

        a boolean value determining if multiple dates can be chosen 
        simultaneously
        **/
        "multiple": {
            get: function(){
                return this._multiple;
            },
            set: function(multi){
                this._multiple = multi;
                this.chosen = this._getSanitizedChosenRanges(this.chosen);
                this.render(true);
            }
        },

        /** Calendar.span: (read-writeable)

        the number of months to show in the calendar display
        **/
        "span":{
            get: function(){
                return this._span;
            },
            set: function(newSpan){
                var parsedSpan = parseIntDec(newSpan);
                if(!isNaN(parsedSpan) && parsedSpan >= 0){
                    this._span = parsedSpan;
                }
                else{
                    this._span = 0;
                }
                this.render(false);
            }
        },

        /** Calendar.view: (read-writeable)

        the cursor date to center the calendar display on 
        **/
        "view":{
            attribute: {},
            get: function(){
                return this._viewDate;
            },
            set: function(rawViewDate){
                var newViewDate = this._getSanitizedViewDate(rawViewDate);
                var oldViewDate = this._viewDate;
                this._viewDate = newViewDate;

                this.render(getMonth(oldViewDate) === getMonth(newViewDate) &&
                            getYear(oldViewDate) === getYear(newViewDate));
            }
        },

        /** Calendar.chosen: (read-writeable)

        the Date/[Date,Date] array representing the dates currently marked
        as chosen

        setter can take a date or a Date/[Date,Date] array
        (null is interpreted as an empty array)
        **/
        "chosen": {
            get: function(){
                return this._chosenRanges;
            },
            set: function(newChosenRanges){
                this._chosenRanges = 
                        this._getSanitizedChosenRanges(newChosenRanges);
                this.render(true);
            }
        },

        "firstWeekdayNum": {
            get: function(){
                return this._firstWeekdayNum;
            },
            set: function(weekdayNum){
                weekdayNum = parseIntDec(weekdayNum);
                if(!isWeekdayNum(weekdayNum)){
                    weekdayNum = 0;
                }
                this._firstWeekdayNum = weekdayNum;
                this.render(false);
            }
        },

        "lastWeekdayNum": {
            get: function(){
                return (this._firstWeekdayNum + 6) % 7;
            }
        },

        /** Calendar.customRenderFn: (read-writable)

        a function taking in a day element, its corresponding Date object,
        and the iso string corresponding to this date 
        used to apply any user-defined rendering to the days in the element
        **/
        "customRenderFn": {
            get: function(){
                return this._customRenderFn;
            },
            set: function(newRenderFn){
                this._customRenderFn = newRenderFn;
                this.render(true);
            }
        },

        /** Calendar.chosenString: (readonly)

        an attribute safe string representing the currently chosen range of
        dates (ie: the JSON string representing it)
        **/
        "chosenString":{
            get: function(){
                if(this.multiple){
                    var isoDates = this.chosen.slice(0);

                    for(var i=0; i < isoDates.length; i++){
                        var range = isoDates[i];
                        if(isValidDateObj(range)){
                            isoDates[i] = iso(range);
                        }
                        else{
                            isoDates[i] = [iso(range[0]), iso(range[1])];
                        }
                    }
                    return JSON.stringify(isoDates);
                }
                else if(this.chosen.length > 0){
                    return iso(this.chosen[0]);
                }
                else{
                    return "";
                }
            }
        },

        /** Calendar.firstVisibleMonth: (readonly) 

        gets the Date of the first day in the 
        first month out of those included in the calendar span
        **/
        "firstVisibleMonth": {
            get: function(){
                return findFirst(
                         relOffset(this.view, 0, -Math.floor(this.span/2), 0)
                       );  
            }
        },

        /** Calendar.lastVisibleMonth: (readonly)

        gets the Date of the first day in the
        last month out of those included in the calendar span
        **/
        "lastVisibleMonth": {
            get: function(){
                return relOffset(this.firstVisibleMonth, 0, 
                                 Math.max(0, this.span-1), 0);
            }
        },

        "firstVisibleDate": {
            get: function(){
                return findWeekStart(this.firstVisibleMonth, 
                                     this.firstWeekdayNum);
            }
        },

        "lastVisibleDate": {
            get: function(){
                return findWeekEnd(findLast(this.lastVisibleMonth), 
                                   this.lastWeekdayNum);
            } 
        },

        "labels": {
            get: function(){
                return this._labels;
            },
            set: function(newLabelData){
                var oldLabelData = this.labels;
                for(var labelType in oldLabelData){
                    if(!(labelType in newLabelData)) continue;

                    var oldLabel = this._labels[labelType];
                    var newLabel = newLabelData[labelType];
                    // if the old label data used an array of labels for a 
                    // certain type of label, ensure that 
                    // the replacement labels are also an array of the same
                    // number of labels
                    if(isArray(oldLabel)){
                        if(isArray(newLabel) && 
                           oldLabel.length === newLabel.length)
                        {
                            newLabel = newLabel.slice(0);
                            for (var i = 0; i < newLabel.length; i++) {
                                // check for existing builtin toString for
                                // string casting optimization
                                newLabel[i] = (newLabel[i].toString) ? 
                                                newLabel[i].toString() : 
                                                String(newLabel[i]);
                            }
                        }
                        else{
                            throw("invalid label given for '"+labelType+
                                  "': expected array of "+ oldLabel.length + 
                                  " labels, got " + JSON.stringify(newLabel));
                        }
                    } 
                    else{
                        newLabel = String(newLabel);
                    }
                    oldLabelData[labelType] = newLabel;
                }
                this.render(false);
            }
        }
    });

    /** _onDragStart: (x-calendar DOM, Date)

    when called, sets xCalendar to begin tracking a drag operation

    also toggles the given day if allowed
    **/
    function _onDragStart(xCalendar, day){
        var isoDate = day.getAttribute("data-date");
        var dateObj = parseSingleDate(isoDate);
        var toggleEventName;
        if(hasClass(day, CHOSEN_CLASS)){
            xCalendar.xtag.dragType = DRAG_REMOVE;
            toggleEventName = "datetoggleoff";
        }
        else{
            xCalendar.xtag.dragType = DRAG_ADD;
            toggleEventName = "datetoggleon";
        }
        xCalendar.xtag.dragStartEl = day;
        xCalendar.xtag.dragAllowTap = true;

        if(!xCalendar.noToggle){
            xtag.fireEvent(xCalendar, toggleEventName,
                           {detail: {date: dateObj, iso: isoDate}});
        }

        xCalendar.setAttribute("active", true);
        day.setAttribute("active", true);
    }

    /** _onDragMove: (x-calendar DOM, Date)

    when called, handles toggling behavior for the given day if needed
    when drag-painted over

    sets active attribute for the given day as well, if currently dragging
    **/
    function _onDragMove(xCalendar, day){
        var isoDate = day.getAttribute("data-date");
        var dateObj = parseSingleDate(isoDate);
        if(day !== xCalendar.xtag.dragStartEl){
            xCalendar.xtag.dragAllowTap = false;
        }

        if(!xCalendar.noToggle){
            // trigger a selection if we enter a nonchosen day while in
            // addition mode
            if(xCalendar.xtag.dragType === DRAG_ADD && 
               !(hasClass(day, CHOSEN_CLASS)))
            {
                xtag.fireEvent(xCalendar, "datetoggleon", 
                               {detail: {date: dateObj, iso: isoDate}});
            }
            // trigger a remove if we enter a chosen day while in
            // removal mode
            else if(xCalendar.xtag.dragType === DRAG_REMOVE && 
                    hasClass(day, CHOSEN_CLASS))
            {
                xtag.fireEvent(xCalendar, "datetoggleoff", 
                               {detail: {date: dateObj, iso: isoDate}});
            }
        }
        if(xCalendar.xtag.dragType){
            day.setAttribute("active", true);
        }
    }

    /** _onDragEnd

    when called, ends any drag operations of any x-calendars in the document
    **/
    function _onDragEnd(e){
        var xCalendars = xtag.query(document, "x-calendar");
        for(var i = 0; i < xCalendars.length; i++){
            var xCalendar = xCalendars[i];
            xCalendar.xtag.dragType = null;
            xCalendar.xtag.dragStartEl = null;
            xCalendar.xtag.dragAllowTap = false;
            xCalendar.removeAttribute("active");
        }

        var days = xtag.query(document, "x-calendar .day[active]");
        for(var j=0; j < days.length; j++){
            days[j].removeAttribute("active");
        }
    }

    /* _pointIsInRect: (Number, Number, {left: number, top: number, 
                                         right: number, bottom: number})
    */
    function _pointIsInRect(x, y, rect){
        return (rect.left <= x && x <= rect.right && 
                rect.top <= y && y <= rect.bottom);
    }

    // added on the body to delegate dragends to all x-calendars
    var DOC_MOUSEUP_LISTENER = null;
    var DOC_TOUCHEND_LISTENER = null;

    xtag.register("x-calendar", {
        lifecycle: {
            created: function(){
                this.innerHTML = "";

                var chosenRange = this.getAttribute("chosen");
                this.xtag.calObj = new Calendar({
                    span: this.getAttribute("span"),
                    view: parseSingleDate(this.getAttribute("view")),
                    chosen: parseMultiDates(chosenRange),
                    multiple: this.hasAttribute("multiple"),
                    firstWeekdayNum : this.getAttribute("first-weekday-num")
                });
                appendChild(this, this.xtag.calObj.el);

                this.xtag.calControls = null;

                // used to track if we are currently in a dragging operation, 
                // and if so, what type
                this.xtag.dragType = null;
                // used to track if we've entered any other elements
                // so that "tap" isn't fired on a drag
                this.xtag.dragStartEl = null;
                this.xtag.dragAllowTap = false;
            },

            // add the global listeners only once
            inserted: function(){
                if(!DOC_MOUSEUP_LISTENER){
                    DOC_MOUSEUP_LISTENER = xtag.addEvent(document, "mouseup", 
                                                         _onDragEnd);
                }
                if(!DOC_TOUCHEND_LISTENER){
                    DOC_TOUCHEND_LISTENER = xtag.addEvent(document, "touchend", 
                                                          _onDragEnd);
                }
                this.render(false);
            },
            // remove the global listeners only if no calendars exist in the
            // document anymore
            removed: function(){
                if(xtag.query(document, "x-calendar").length === 0){
                    if(DOC_MOUSEUP_LISTENER){
                        xtag.removeEvent(document, "mouseup", 
                                         DOC_MOUSEUP_LISTENER);
                        DOC_MOUSEUP_LISTENER = null;
                    }
                    if(DOC_TOUCHEND_LISTENER){
                        xtag.removeEvent(document, "touchend", 
                                         DOC_TOUCHEND_LISTENER);
                        DOC_TOUCHEND_LISTENER = null;
                    }
                }
            }
        },
        events: {
            // when clicking the 'next' control button
            "tap:delegate(.next)": function(e){
                var xCalendar = e.currentTarget;
                xCalendar.nextMonth();

                xtag.fireEvent(xCalendar, "nextmonth");
            },

            // when clicking the 'previous' control button
            "tap:delegate(.prev)": function(e){
                var xCalendar = e.currentTarget;
                xCalendar.prevMonth();

                xtag.fireEvent(xCalendar, "prevmonth");
            },

            "tapstart:delegate(.day)": function(e){
                // prevent firing on right click
                if((!e.touches) && e.button && e.button !== LEFT_MOUSE_BTN){
                    return;
                }
                 // prevent dragging around existing selections
                 // also prevent mobile drag scroll
                e.preventDefault();
                if(e.baseEvent) e.baseEvent.preventDefault();
                _onDragStart(e.currentTarget, this);
            },

            // touch drag move, firing toggles on newly entered dates if needed
            "touchmove": function(e){
                if(!(e.touches && e.touches.length > 0)){
                    return;
                }

                var xCalendar = e.currentTarget;
                if(!xCalendar.xtag.dragType){
                    return;
                }

                var touch = e.touches[0];
                var days = xtag.query(xCalendar, ".day");
                for (var i = 0; i < days.length; i++) {
                    var day = days[i];
                    if(_pointIsInRect(touch.pageX, touch.pageY, getRect(day))){
                        _onDragMove(xCalendar, day);
                    }
                    else{
                        day.removeAttribute("active");
                    }
                }
            },

            // mouse drag move, firing toggles on newly entered dates if needed
            "mouseover:delegate(.day)": function(e){
                var xCalendar = e.currentTarget;
                var day = this;

                _onDragMove(xCalendar, day);
            },
            "mouseout:delegate(.day)": function(e){
                var day = this;
                day.removeAttribute("active");
            },

            // if day is actually tapped, fire a datetap event
            "tapend:delegate(.day)": function(e){
                var xCalendar = e.currentTarget;

                // make sure that we can actually consider this a tap
                // (note that this delegated version fires before the 
                //  mouseup/touchend events we assigned to the document)
                if(!xCalendar.xtag.dragAllowTap){
                    return;
                }
                var day = this;
                var isoDate = day.getAttribute("data-date");
                var dateObj = parseSingleDate(isoDate);
                
                xtag.fireEvent(xCalendar, "datetap", 
                               {detail: {date: dateObj, iso: isoDate}});
            },

            "datetoggleon": function(e){
                var xCalendar = this;
                xCalendar.toggleDateOn(e.detail.date, xCalendar.multiple);
            },

            "datetoggleoff": function(e){
                var xCalendar = this;
                xCalendar.toggleDateOff(e.detail.date);
            }
        },
        accessors: {
            // handles if the x-calendar should display navigation controls or
            // not
            controls: {
                attribute: {boolean: true},
                set: function(hasControls){
                    if(hasControls && !this.xtag.calControls){
                        this.xtag.calControls = makeControls(this.xtag.calObj.labels);
                        // append controls AFTER calendar to use natural stack 
                        // order instead of needing explicit z-index
                        appendChild(this, this.xtag.calControls);
                    }
                }
            },
            // handles if the x-calendar should allow multiple dates to be 
            // chosen at once
            multiple: {
                attribute: {boolean: true},
                get: function(){
                    return this.xtag.calObj.multiple;
                },
                set: function(multi){
                    this.xtag.calObj.multiple = multi;
                    this.chosen = this.chosen;
                }
            },
            // handles how many months the x-calendar displays at once
            span: {
                attribute: {},
                get: function(){
                    return this.xtag.calObj.span;
                },
                set: function(newCalSpan){
                    this.xtag.calObj.span = newCalSpan;   
                }
            },
            // handles where the x-calendar's display is focused
            view: {
                attribute: {},
                get: function(){
                    return this.xtag.calObj.view;
                },
                set: function(newView){
                    var parsedDate = parseSingleDate(newView);
                    if(parsedDate){
                        this.xtag.calObj.view = parsedDate;
                    }
                }
            },
            // handles which dates are marked as chosen in the x-calendar
            // setter can take a parseable string, a singular date, or a range
            // of dates/dateranges
            chosen: {
                attribute: {skip: true},
                get: function(){
                    var chosenRanges = this.xtag.calObj.chosen;
                    // return a single date if multiple selection not allowed
                    if(!this.multiple){
                        if(chosenRanges.length > 0){
                            var firstRange = chosenRanges[0];
                            if(isValidDateObj(firstRange)){
                                return firstRange;
                            }
                            else{
                                return firstRange[0];
                            }
                        }
                        else{
                            return null;
                        }
                    }
                    // otherwise return the entire selection list
                    else{
                        return this.xtag.calObj.chosen;
                    }
                },
                set: function(newDates){
                    var parsedDateRanges = (this.multiple) ? 
                                            parseMultiDates(newDates) : 
                                            parseSingleDate(newDates);
                    if(parsedDateRanges){
                        this.xtag.calObj.chosen = parsedDateRanges;
                    }
                    else{
                        this.xtag.calObj.chosen = null;
                    }

                    if(this.xtag.calObj.chosenString){
                        // override attribute with auto-generated string
                        this.setAttribute("chosen", 
                                          this.xtag.calObj.chosenString);
                    }
                    else{
                        this.removeAttribute("chosen");
                    }
                }
            },

            // handles which day to use as the first day of the week
            firstWeekdayNum: {
                attribute: {name: "first-weekday-num"},
                set: function(weekdayNum){
                    this.xtag.calObj.firstWeekdayNum = weekdayNum;
                }
            },

            // handles if the x-calendar allows dates to be chosen or not
            // ie: if set, overrides default chosen-toggling behavior of the UI
            noToggle: {
                attribute: {boolean: true, name: "notoggle"},
                set: function(toggleDisabled){
                    if(toggleDisabled){
                        this.chosen = null;
                    }
                }
            },

            // (readonly) retrieves the first day in the first fully-visible 
            // month of the calendar
            firstVisibleMonth: {
                get: function(){
                    return this.xtag.calObj.firstVisibleMonth;
                }
            },

            // (readonly) retrieves the first day in the last fully-visible 
            // month of the calendar
            lastVisibleMonth: {
                get: function(){
                    return this.xtag.calObj.lastVisibleMonth;
                }
            },

            // (readonly) retrieves the first day in the calendar, even if it
            // is not part of a fully visible month
            firstVisibleDate: {
                get: function(){
                    return this.xtag.calObj.firstVisibleDate;
                }
            },

            // (readonly) retrieves the last day in the calendar, even if it
            // is not part of a fully visible month
            lastVisibleDate: {
                get: function(){
                    return this.xtag.calObj.lastVisibleDate;
                }
            },

            /** a function taking the following parameters:
               - a html element representing a day in the calendar
               - its corresponding Date object
               - the iso string corresponding to this Date
            
            this custom function is called whenever the calendar needs to be
            rendered, and is used to provide more flexibility in dynamically
            styling days of the calendar

            IMPORTANT NOTE: because this is called whenever the calendar is
            rendered, and because most calendar attribute changes
            **/
            customRenderFn: {
                get: function(){
                    return this.xtag.calObj.customRenderFn;
                },
                set: function(newRenderFn){
                    this.xtag.calObj.customRenderFn = newRenderFn;
                }
            },

            labels: {
                get: function(){
                    // clone labels to prevent user from clobbering aliases
                    return JSON.parse(JSON.stringify(this.xtag.calObj.labels));
                },
                // if given a datamap of labels whose keys match those in 
                // DEFAULT_LABELS, reassign the labels using those in the given
                // newLabelData. Ensures that labels that were initially strings
                // stay strings, and that labels that were initially arrays of 
                // strings stay arrays of strings (with the same # of elements)
                set: function(newLabelData){
                    this.xtag.calObj.labels = newLabelData;
                    var labels = this.xtag.calObj.labels;
                    // also update the control labels, if available
                    var prevControl = this.querySelector(".controls > .prev");
                    if(prevControl) prevControl.textContent = labels.prev;

                    var nextControl = this.querySelector(".controls > .next");
                    if(nextControl) nextControl.textContent = labels.next;
                }
            }
        },
        methods: { 
            // updates the x-calendar display, recreating nodes if preserveNodes
            // if falsy or not given
            render: function(preserveNodes){
                this.xtag.calObj.render(preserveNodes);
            },

            // Go back one month by updating the view attribute of the calendar
            prevMonth: function(){
                var calObj = this.xtag.calObj;
                calObj.view = relOffset(calObj.view, 0, -1, 0);
            },

            // Advance one month forward by updating the view attribute 
            // of the calendar
            nextMonth: function(){
                var calObj = this.xtag.calObj;
                calObj.view = relOffset(calObj.view, 0, 1, 0);
            },

            // sets the given date as chosen, either overriding the current
            // chosen dates if append is falsy or not given, or adding to the
            // list of chosen dates, if append is truthy
            // also updates the chosen attribute of the calendar
            toggleDateOn: function(newDateObj, append){
                this.xtag.calObj.addDate(newDateObj, append);
                // trigger setter
                this.chosen = this.chosen;
            },

            // removes the given date from the chosen list
            // also updates the chosen attribute of the calendar
            toggleDateOff: function(dateObj){
                this.xtag.calObj.removeDate(dateObj);
                // trigger setter
                this.chosen = this.chosen;
            },

            // switches the chosen status of the given date
            // 'appendIfAdd' specifies how the date is added to the list of 
            // chosen dates if toggled on 
            // also updates the chosen attribute of the calendar
            toggleDate: function(dateObj, appendIfAdd){
                if(this.xtag.calObj.hasChosenDate(dateObj)){
                    this.toggleDateOff(dateObj);
                }
                else{
                    this.toggleDateOn(dateObj, appendIfAdd);
                }
            },

            // returns whether or not the given date is in the visible
            // calendar display, optionally ignoring dates outside of the
            // month span
            hasVisibleDate: function(dateObj, excludeBadMonths){
                return this.xtag.calObj.hasVisibleDate(dateObj, 
                                                       excludeBadMonths);
            }
        }
    });

})();