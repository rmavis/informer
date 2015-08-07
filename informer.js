/*
 * INFORMER
 *
 * This module processes forms. Its main function is to generate an
 * object representing the form data.
 *
 * So when this form is submitted:
 * <form name="new-user" action="/api/users" method="post" onsubmit="Informer.submit(this)" onreturn="handler">
 *   <input name="email" value="what@evv.err" />
 *   <input name="password" value="so clever" />
 *   <input type="submit" name="submit" value="Make it so" />
 * </form>
 * it will POST this object:
 * {new-user:{email:"what@evv.err",password:"so clever"},submit:"Make it so"}
 * to `/api/users`, and then pass the return to `handler`.
 *
 * The `collect` and `submit` methods both generate the data object.
 * The `collect` method will return it, and `submit` will send it to
 * the URL indicated by the form's `action` attribute via the method
 * specified by the form's `method` attribute, as you might expect
 * from those standard attributes.
 *
 * Values from the form can be grouped with a `group` attribute on
 * the input elements, and those groups can be arbitrarily complex
 * by separating the group names with a colon. So these inputs:
 * <input name="email" group="login" value="what@evv.err" />
 * <input name="password" group="login" value="so clever" />
 * <input name="f_name" group="personal" value="Taylor" />
 * <input name="l_name" group="personal" value="Swift" />
 * will generate:
 * {login: {email: "what@evv.err", password: "so clever"} },
 * {personal: {f_name: "Taylor", l_name: "Swift"} }
 * and these inputs:
 * <input name="email" group="user:login" value="what@evv.err" />
 * <input name="password" group="user:login" value="so clever" />
 * <input name="f_name" group="user:personal" value="Taylor" />
 * <input name="l_name" group="user:personal" value="Swift" />
 * will generate:
 * {user: {login: {email: "what@evv.err", password: "so clever"} },
 *        {personal: {f_name: "Taylor", l_name: "Swift"} } }
 *
 * If the form has an `onreturn` attribute (that name is set by the
 * value of `conf.elem_callback_attr`), then after it is submitted,
 * the server's return will be passed to that function.
 *
 * The `trigger` method will read the form's `action` attribute
 * (specified in `conf.elem_trigger_attr`) and, if that attribute
 * names a function, send the form element to that function.
 *
 * This module requires http.js to handle the requests.
 *
 * TODO:
 * - Input validation
 * - Error handling
 */

var Informer = (function () {

    var conf = {
        // If this form attribute is a function name, that function
        // will be sent the triggering form element.
        elem_trigger_attr: 'action',
        // A form can specify a function name in this attribute and
        // it will be sent the server return after the form submits.
        elem_callback_attr: 'onreturn',
        // If the form has no `name` or `id`, then this will become
        // the key for the values. If false, no key will be used.
        unnamed_form_key: null,  // 'json'
        // If you want to transform the data object before it gets
        // sent, make this a function name. Else, null it.
        data_transform_func: JSON.stringify
    };

    // These are the `tagName`s to scan for in the form.
    var input_types = [
        'input', 'select', 'textarea'
    ];

    // These are the attributes to pull from the elements.
    // They will become keys to the element's value object.
    // The 'value' is assumed and doesn't need to be included.
    var value_attributes = [
        'name', 'group'
    ];

    // This is the most recently submitted form. It's
    // publicly accessible, useful for callback methods.
    var last_action_form = null;

    // This triggers logging.
    var verbose = true;



    function log(message) {
        if (verbose) {
            console.log(message);
        }
    }



    function checkSubmitEvent() {
        if (window.event.type == 'submit') {
            window.event.preventDefault();
        }
    }



    function handleSubmission(form) {
        if ((url = form.getAttribute('action')) &&
            (method = form.getAttribute('method'))) {
            // This will return false if the parameter doesn't name
            //  a function, which is an acceptable callback parameter.
            var func = (chk = form.getAttribute(conf.elem_callback_attr))
                ? stringToFunction(chk)
                : null;

            var vals = toObject(form, conf.data_transform_func);
            last_action_form = form;

            Http[method]({
                url: url,
                params: vals,
                callback: func
            });
        }

        else {
            // If `verbose` is false, then this will silently fail, and that is the suck.
            console.log("To submit, the form element needs these attributes: `action`, being the URL to send the data to, and `method`, being the HTTP verb to use, either 'get' or 'post'");
        }
    }



    function handleAction(form) {
        if ((func = form.getAttribute(conf.elem_trigger_attr)) &&
            (winf = stringToFunction(func)) &&
            (typeof winf == 'function')) {
            last_action_form = form;
            winf(form);
        }

        else {
            // Same as the above.
            console.log("The form's `action` attribute doesn't name a function callable by Informer.");
        }
    }



    function toObject(form, transform) {
        var vals = { };
        var key = ((k = form.getAttribute('name')) || (k = form.getAttribute('id'))) || conf.unnamed_form_key;

        if (typeof transform == 'function') {
            var valobj = transform(gatherTheValues(form));
        }
        else {
            var valobj = gatherTheValues(form);
        }

        if (key) {
            vals[key] = valobj;
        }
        else {
            vals = valobj;
        }

        return vals;
    }



    function gatherTheValues(form) {
        last_action_form = form;
        return groupValues(elemsToObjs(form));
    }



    function elemsToObjs(form) {
        var vals = [ ];

        for (var o = 0, m = input_types.length; o < m; o++) {
            var elems = form.getElementsByTagName(input_types[o]);
            for (var i = 0, n = elems.length; i < n; i++) {
                vals.push(elemToObject(elems[i]));
            }
        }

        log("The form's value objects:");
        log(vals);

        return vals;
    }



    // Pass this an array of returns from `elemsToObjs`.
    function groupValues(val_objs) {
        log("Grouping values:");
        log(val_objs);

        var vals_struct = { };

        for (var o = 0, m = val_objs.length; o < m; o++) {
            if (group_str = val_objs[o]['group']) {
                log("'"+val_objs[o]['name']+"' group string: " + group_str);

                var form_val = { };
                form_val[val_objs[o]['name']] = val_objs[o]['value'];

                var val_struct = buildNestedObject(group_str.split(':'),
                                                   form_val);

                log("Built nested object:");
                log(val_struct);

                vals_struct = mergeObjects(vals_struct, val_struct);
            }

            else {
                log("'"+val_objs[o]['name']+"' has no group, adding its value to the structure base.");
                vals_struct[val_objs[o]['name']] = val_objs[o]['value'];
            }
        }

        log("Structured values:");
        log(vals_struct);

        return vals_struct;
    }



    function elemToObject(elem, attrs) {
        attrs = (typeof attrs == 'undefined') ? value_attributes : attrs;

        log("Converting element to value object:");
        log(elem);

        var obj = { };
        obj['value'] = elem.value;

        for (var o = 0, m = attrs.length; o < m; o++) {
            obj[attrs[o]] = elem.getAttribute(attrs[o]) || false;
        }

        log("Built value object:");
        log(obj);

        return obj;
    }



    /*
     * These functions are essential to Informer but
     * might be useful as general utility functions.
     */

    // This is a modified version of the procedure found here:
    // http://stackoverflow.com/questions/912596/how-to-turn-a-string-into-a-javascript-function-call
    // Rather than produce a callable function and then call it with supplied arguments,
    // this just returns the function.
    function stringToFunction(functionName, context) {
        context = (typeof context == 'undefined') ? window : context;

        var namespaces = functionName.split('.');
        var func = namespaces.pop();

        for (var o = 0, m = namespaces.length; o < m; o++) {
            context = context[namespaces[o]];
        }

        if (typeof context[func] == 'function') {
            return context[func];
        }
        else {
            return false;
        }
    }



    function buildNestedObject(keys, end_val) {
        var ret = { };

        if (keys.length == 1) {
            if (keys[0] in ret) {
                if (!(typeof end_val == 'undefined')) {
                    if (end_val.constructor == Object) {
                        ret[keys[0]] = mergeObjects(ret[keys[0]], end_val);
                    }
                    else {
                        ret[keys[0]] = end_val;
                    }
                }
            }
            else {
                ret[keys[0]] = (typeof end_val == 'undefined') ? { } : end_val;
            }
        }
        else {
            ret[keys[0]] = buildNestedObject(keys.slice(1), end_val);
        }

        return ret;
    }



    function mergeObjects(obj1, obj2) {
        for (var key in obj2) {
            if (obj2.hasOwnProperty(key)) {
                if ((obj1[key]) &&
                    (obj1[key].constructor == Object) &&
                    (obj2[key].constructor == Object)) {
                    obj1[key] = mergeObjects(obj1[key], obj2[key]);
                }
                else {
                    obj1[key] = obj2[key];
                }
            }
        }

        return obj1;
    }



    function getFormFromEvent(evt) {
        var event = (evt) ? evt : window.event;
        var elem = event.target || event.srcElement;
        var form = getNearestParent(elem, 'form');
        return form;
    }



    function getNearestParent(source, tagname) {
        var elem = source;

        while ((!elem.tagName) ||
               ((elem.tagName.toLowerCase() != tagname) &&
                (elem != document.body))) {
            elem = elem.parentNode;
        }

        if (elem == document.body) {return false;}
        else {return elem;}
    }





    /*
     * Public methods.
     */
    return {

        collect: function(form) {
            checkSubmitEvent();
            return gatherTheValues(form);
        },

        submit: function(form) {
            checkSubmitEvent();
            handleSubmission(form);
        },

        trigger: function(evt) {
            var form = getFormFromEvent(evt);
            if (form) {handleAction(form);}
        },

        tagnames: function() {
            return input_types;
        },

        form: function() {
            return last_action_form;
        }

    }

})();
