/*
 * INFORMER
 * processes forms. In particular, it generates JSON and sends that
 * to the form's target via the form's method.
 *
 * It does a few cool tricks that rely on nothing more than ordinary
 * and ordinary-looking HTML attributes.
 *
 * Typical usage:
 * - create a form in the normal way, using all the normal attributes
 * - on that page, call `new Informer()`, passing it an object with
 *   keys `region` and `target`, both containing elements.
 *   The `region` element is optional. It indicates the parent element
 *   of all the elements Informer should act on. If no `region` is
 *   given, then the default will be the `document`.
 *   The `target` element is not *really* optional, but *technically*
 *   is. It indicates where to put the return from the server after the
 *   forms are submitted. If none is given, then an element with ID
 *   'work-space' will be assumed.
 * - when the form is submited, Informer will gather the form's values
 *   into an object, the keys being the `name`s of the input elements,
 *   and pass them as JSON to the server. The JSON will be keyed to
 *   the form's `name` or `id` attribute, if they exist, or `json` if
 *   neither do. The form's `method` and `target` attributes determine
 *   where and how the values are sent.
 * - the return from the server is made the innerHTML of the `target`
 *   element.
 *
 * Special stuff:
 * - You can add an `initAction` key to the initializing parameter and,
 *   if that is a valid function name in Informer, then it will be called
 *   at the end of the `init` function.
 * - You can add a `group` attribute to inputs. Values in `group`ed
 *   elements will be collected into sub-objects keyed to the name of
 *   the `group`.
 * - You can add an `autosubmit` attribute to inputs. These inputs will
 *   listen for `change` events and submit the form when triggered.
 * - You can add an `action` attribute to the form element. If the
 *   value of this attribute is the name of a function in Informer, then
 *   that function will be called when the form is submitted.
 * - You can chain the `autosubmit` and `action` features together to
 *   do cool things.
 * - You can add an `onreturn` attribute to form elements. If the value
 *   of that attribute is the name of a function in Informer, then that
 *   function will be fired after the form is submitted. If the server
 *   returned anything, then that will be available in the `this.return`
 *   variable.
 * - You can add a `terminal` attribute to form elements. If the value
 *   of that attribute is the `id` of an element, then that element
 *   will receive the return from the form, acting as that form's
 *   `target` -- the instance's `target` element will not be changed.
 *
 *
 */


function Informer(params) {

    /*
     * Custom functions.
     * Add any functions you'll want to call `action` here.
     */

    this.startup = function() {
        this.caller = document.getElementById('form-select-main');
        this.displayCalledForm();
        this.reset();
    };



    this.displayCalledForm = function() {
        this.gatherTheValues();

        var target = false,
            dispswap = false;

        if (this.values['work-action'] == 'select') {
            if (this.values['work-target'] == 'venue') {
                target = 'form-select-venue';
            }
            else if (this.values['work-target'] == 'event') {
                target = 'form-select-event';
            }
            else if (this.values['work-target'] == 'user') {
                target = 'form-select-user';
            }
            dispswap = 'dispplural';
        }
        else if (this.values['work-action'] == 'create') {
            if (this.values['work-target'] == 'venue') {
                target = 'form-create-venue';
            }
            else if (this.values['work-target'] == 'event') {
                target = 'form-create-event';
            }
            else if (this.values['work-target'] == 'user') {
                target = 'form-create-user';
            }
            dispswap = 'dispsingular';
        }

        if (target) {
            var upform = document.getElementById(target);
            var forms = this.region.getElementsByTagName('form');
            for (var o = 0; o < forms.length; o++) {
                if ((forms[o] !== this.caller) &&
                    (forms[o] !== upform)) {
                    forms[o].style.display = 'none';
                }
            }

            upform.style.display = 'block';
        }

        if (dispswap) {
            var opts = this.caller['work-target'];
            for (var o = 0; o < opts.length; o++) {
                if (swap = opts[o].getAttribute(dispswap)) {
                    opts[o].text = swap;
                }
            }
        }
    };



    this.blammo = function() {
        console.log('blammo');
        if (this.return === null) {
            console.log("return is null");
        }
        else {
            console.log("return is not null");
        }
    };



    // NEED TO CHECK FOR NEW SCRIPT ELEMENTS
    this.successor = function() {
        var target = document.getElementById(this.caller.getAttribute('terminal'));
        target.innerHTML = this.return;
        this.checkForScripts(target);
    };






    /*
     * Library functions.
     * You shouldn't need to edit any of these.
     */

    this.init = function(pobj) {
        // The region receives the response.
        if ('region' in pobj) {
            this.region = pobj.region;
        } else {
            this.region = document;
        }

        // The target receives the response.
        if ('target' in pobj) {
            this.target = pobj.target;
        } else {
            this.target = document.getElementById('work-space');
        }

        // This will become the current form.
        this.caller = null;
        // This will become the current form's values.
        this.values = null;
        // This will become the return from the server.
        this.return = null;

        this.inputTypes = ['input', 'select', 'textarea'];

        this.addListeners();

        if (('initAction' in pobj) && (this[pobj.initAction])) {
            this[pobj.initAction]();
        }
    };



    this.reset = function() {
        this.caller = null;
        this.values = null;
        this.return = null;
    };



    this.addListeners = function() {
        var forms = this.region.getElementsByTagName('form');

        for (var o = 0; o < forms.length; o++) {
            forms[o].addEventListener('submit', this, false);

            for (var i = 0; i < this.inputTypes.length; i++) {
                var elems = forms[o].getElementsByTagName(this.inputTypes[i]);
                for (var u = 0; u < elems.length; u++) {
                    if (elems[u].getAttribute('autosubmit')) {
                        elems[u].addEventListener('change', this, false);
                    }
                }
            }
        }
    };


    this.removeListeners = function() {
        var forms = this.region.getElementsByTagName('form');
        for (var o = 0; o < forms.length; o++) {
            forms[o].removeEventListener('submit');

            for (var i = 0; i < this.inputTypes.length; i++) {
                var elems = forms[o].getElementsByTagName(this.inputTypes[i]);
                for (var u = 0; u < elems.length; u++) {
                    if (elems[u].getAttribute('autosubmit')) {
                        elems[u].removeEventListener('change');
                    }
                }
            }
        }
    };



    this.handleEvent = function(evt) {
        if (!evt) {var evt = window.event;}
        this.evt = evt;

        this.evt.stopPropagation();
        this.evt.preventDefault();

        if (this.evt.type == 'change') {
            this.actOnCaller();
        }
        else if (this.evt.type == 'submit') {
            this.procCaller();
        }
        else {
            console.log("Unhandled event type: " + this.evt.type);
        }
    };



    this.actOnCaller = function() {
        if (this.getCallerFromEvent()) {
            if (act = this.caller.getAttribute('action')) {
                if (this[act]) {
                    this[act]();
                }
            }
        }
    };



    this.procCaller = function() {
        if (this.getCallerFromEvent()) {
            // For custom submit actions.
            if ((act = this.caller.getAttribute('action')) && (this[act])){
                this[act]();
            }

            // It would be possible to pass a custom
            // action to Informer on initialization.

            // Else, the standard.
            else {
                this.gatherTheValues();
                if (this.values !== null) {
                    this.submitTheValues();
                }
                else {
                    console.log("bork");
                }
            }
        }
    };



    this.getCallerFromEvent = function() {
        this.caller = this.evt.target;
        while ((this.caller !== document.body) &&
               (this.caller.tagName.toLowerCase() !== 'form')) {
            this.caller = this.caller.parentNode;
        }

        var ret = (this.caller == document.body) ? false : true;
        return ret;
    };



    // Inputs with a common group attribute will become an object.
    // The key of the object will be the group name, and the keys
    // of each value within the object will be the input names.
    // Groups with a common pargroup attribute will become children
    // of an object, the key of which will be the name of the pargroup.

    // NOTE: one flaw of this function as it exists is that groups are
    // gathered irrespective of pargroups, and the latest-occurring pargroup
    // of a group member becomes the pargroup of the group, and only then are
    // the pargroups created/moved. So if hypothetical keys 'date_start' and
    // 'date_end' both need subgroups named 'day', then
    // this will fail to gather as expected. #TODO

    // The `group` attribute names the object that inputs will be gathered into.
    // The `pargroup` attribute names the object that a group will be gathered into.
    // A `pargroup` without a `group` will not be recognized.
    // `group` gathers items. `pargroup` gathers groups.
    this.gatherTheValues = function() {
        // NOTE: http://javascript.info/tutorial/objects#object-variables-are-references
        // In javascript, object variables are references. So the changes made to `collated`
        // by `addChildToObject`, despite the differences in variables names and scope, etc,
        // will be made in-place.
        var caller = this.caller,
            inputTypes = this.inputTypes,
            elements = [ ],
            values = { },
            added = false;


        function buildElementsArray() {
            for (var i = 0; i < inputTypes.length; i++) {
                var elems = caller.getElementsByTagName(inputTypes[i]);
                for (var o = 0; o < elems.length; o++) {
                    var elem = { };
                    elem['name'] = elems[o].getAttribute('name');
                    elem['val'] = elems[o].value;
                    elem['group'] = elems[o].getAttribute('group') || false;
                    elem['pargroup'] = elems[o].getAttribute('pargroup') || false;
                    elements.push(elem);
                }
            }
            // console.log("Elements array:");
            // console.log(elements);
        }



        function loopOnElements(baseIsSet) {
            baseIsSet = (typeof baseIsSet == 'undefined') ? false : true;
            var recur = false;

            for (var o = 0; o < elements.length; o++) {
                // This because `delete` just sets an element to `undefined`.
                if (elements[o]) {
                    added = false;
                    // console.log(" ("+ recur +" / " +added+")Checking " + elements[o]['name'] + " for pargroup:" + elements[o]['pargroup'] + " and group: " + elements[o]['group']);
                    if ((!elements[o]['pargroup']) ||
                        ((elements[o]['pargroup']) && (baseIsSet))) {
                        addElementToValues(elements[o], values);
                    }
                    if (added) {
                        // console.log("Added, deleting");
                        delete elements[o];
                        recur = true;
                    }
                }
            }

            if (recur) {
                // console.log("Looping again");
                loopOnElements(true);
            }
        }



        // In this functions, `vals` will be either `values`, which is the main return
        // from this meta-function, or one of the children of `values`. But in JS,
        // objects are references, so modifying `vals`, whether at the time it indicates
        // `values` or one of its children, will modify `values`. This enables a fairly
        // tidy recursive scaning of `values`.
        // It will almost always set `added` to true. The exception is when an `elem`'s
        // `pargroup` doesn't exist in the `vals`: in this case, `added` won't be changed.
        function addElementToValues(elem, vals) {
            // console.log("Adding element?");
            // console.log(elem);
            if (elem['pargroup']) {
                scan:
                for (var key in vals) {
                    if (vals.hasOwnProperty(key)) {
                        if (key == elem['pargroup']) {
                            // console.log("Found " + key + " for " + elem['group'] + " :: " + elem['name'] + '=' + elem['val']);
                            if (!vals[elem['pargroup']][elem['group']]) {
                                vals[elem['pargroup']][elem['group']] = { };
                            }
                            vals[elem['pargroup']][elem['group']][elem['name']] = elem['val'];
                            added = true;
                            break scan;
                        }
                        else if (typeof vals[key] == 'object') {
                            // console.log("Recurring into: " + vals[key]);
                            addElementToValues(elem, vals[key]);
                        }
                    }
                }
            }

            else if (elem['group']) {
                if (!vals[elem['group']]) {
                    vals[elem['group']] = { };
                }
                vals[elem['group']][elem['name']] = elem['val'];
                added = true;
            }

            else {
                vals[elem['name']] = elem['val'];
                added = true;
            }
        }



        function displayErrors() {
            var orphans = [ ];
            for (var o = 0; o < elements.length; o++) {
                if (elements[o]) {
                    orphans.push(elements[o]);
                }
            }

            if (orphans.length > 0) {
                console.log("WARNING: potential information loss.");
                console.log("There are " + orphans.length + " unnecessary pargroup attributes. They are unnecessary because they do not specify parent groups in the form hierarchy.");
                console.log("These pargroups do not occur in form's hierarchy:");
                for (var o = 0; o < orphans.length; o++) {
                    console.log(orphans[o]['pargroup']);
                }
                console.log("Since they do not specify a parent group, it would be best to remove the pargroup attributes from the elements and just use the group attribute instead. As it is, their values are not included in the form's values object");
            }
        }


        // This is the main routine of this meta-function.
        buildElementsArray();
        loopOnElements();
        // This is optional.
        displayErrors();

        this.values = values;
    };



    this.submitTheValues = function() {
        var key = 'json';
        if (k = this.caller.getAttribute('name')) {
            key = k;
        } else if (k = this.caller.getAttribute('id')) {
            key = k;
        }

        console.log(k+"="+JSON.stringify(this.values));
        console.log("Going to: " + this.caller.getAttribute('action') + " via " + this.caller.getAttribute('method'));
        // return;

        var passData = { };
        passData[key] = JSON.stringify(this.values);

        var handler = this.handleTheReturn.bind(this);

        /* The caller's method attribute will be "get" or "post",
         * which are the names of the Http object's public methods. */
        Http[this.caller.getAttribute('method').toLowerCase()]({
            url: this.caller.getAttribute('action'),
            params: passData,
            callback: handler
        });
    };



    this.handleTheReturn = function(ret) {
        this.return = ret;

        // For form-specific post-submit actions.
        if ((act = this.caller.getAttribute('onreturn')) && (this[act])) {
            this[act]();
        }

        // For form-specific target elements.
        else if ((check = this.caller.getAttribute('terminal')) &&
                 (dest = document.getElementById(check))) {
            dest.innerHTML = this.return;
            this.checkForScripts(dest);
        }

        // Else, the standard.
        else {
            this.target.innerHTML = ret;
            this.checkForScripts();
            // this.caller.reset();
        }

        this.reset();
    };



    // This function introduces an element of risk.
    // But I think it's a risk worth taking.
    this.checkForScripts = function(checko) {
        var elem = (typeof checko == 'object')
            ? checko
            : this.target;

        var scrs = elem.getElementsByTagName('script');
        for (var i = 0; i < scrs.length; i++) {
            eval(scrs[i].innerHTML);
        }
    };



    // This needs to stay down here.
    if (typeof params == 'object') {this.init(params);}
    else {this.init({});}
}




// Array Remove - By John Resig (MIT Licensed)
// Array.prototype.remove = function(from, to) {
//   var rest = this.slice((to || from) + 1 || this.length);
//   this.length = from < 0 ? this.length + from : from;
//   return this.push.apply(this, rest);
// };
