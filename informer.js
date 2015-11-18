/*
 * INFORMER
 *
 * This module processes forms. Its main function is to generate an
 * object representing the form data. It can then handle that data
 * in a variety of ways.
 *
 *
 * USAGE
 *
 * When this form is submitted:
 * <form action="/api/users" method="post" onsubmit="Informer.submit(this)">
 *   <input name="email" value="what@evv.err" />
 *   <input name="password" value="so clever" />
 *   <input type="submit" name="submit" value="Make it so" />
 * </form>
 *
 * it will POST the standard data:
 * email=what@evv.err&password=so%20&submit=Make%20it%20so
 *
 * to `/api/users`, then receive the response.
 *
 * But say you want to package the data as JSON before submitting
 * it. You can gather the data from the form, use the name of the
 * form itself as a key, and run the resulting data object through
 * `JSON.stringify`.
 *
 * When this form is submitted:
 * <form action="/api/users" method="post" onsubmit="Informer.submit(this)"
 *  name="new-user" onreturn="handler">
 *   <input name="email" value="what@evv.err" />
 *   <input name="password" value="so clever" />
 *   <input type="submit" name="submit" value="Make it so" />
 * </form>
 *
 * it will build this JSON:
 * {new-user:{email:"what@evv.err",password:"so clever"},
 *  submit:"Make it so"}
 *
 * then POST that to `/api/users`, and then pass the return to
 * the `handler` function.
 *
 * So Informer is fine as a standard form handler but shines when
 * used to generate more complex data objects and pass those objects
 * to the server as JSON.
 *
 *
 * DETAILS
 *
 * There are five public methods: `collect`, `submit`, `trigger`,
 * `tagnames`, and `form`.
 *
 * The `collect` and `submit` methods both generate the data object.
 * The `collect` method will return that object, and `submit` will
 * send it to the URL indicated by the form's `action` attribute via
 * the method specified by the form's `method` attribute, as you
 * might expect from those standard attributes. If a function is
 * named in `conf.data_transform_func`, then the data object will be
 * passed to that before submitting.
 *
 * The `trigger` method will parse the form, build a data object,
 * and pass that object to the function named in the form's `action`
 * attribute (if you'd like, you can specify a different attribute
 * name in `conf.elem_attr_trigger`).
 *
 * The `tagnames` and `form` methods return the tagnames to read
 * from the form and the last form read, respectively.
 *
 * Values from the form can be grouped with a `group` attribute on
 * the input elements, and those groups can be arbitrarily complex
 * by separating the group names with a colon. So these inputs:
 * <input name="email" group="login" value="what@evv.err" />
 * <input name="password" group="login" value="so clever" />
 * <input name="f_name" group="personal" value="Taylor" />
 * <input name="l_name" group="personal" value="Swift" />
 *
 * will generate:
 * {login: {email: "what@evv.err", password: "so clever"} },
 * {personal: {f_name: "Taylor", l_name: "Swift"} }
 *
 * and these inputs:
 * <input name="email" group="user:login" value="what@evv.err" />
 * <input name="password" group="user:login" value="so clever" />
 * <input name="f_name" group="user:personal" value="Taylor" />
 * <input name="l_name" group="user:personal" value="Swift" />
 *
 * will generate:
 * {user: {login: {email: "what@evv.err", password: "so clever"} },
 *        {personal: {f_name: "Taylor", l_name: "Swift"} } }
 *
 * If the form has an `onreturn` attribute (that name is set by the
 * value of `conf.elem_attr_callback`), then after it is submitted,
 * the server's return will be passed to that function.
 *
 *
 * DEPENDENCIES
 *
 * - Http.js for handling the HTTP requests
 * - Utils.js for various utility functions
 *
 *
 * TODO
 * - Input validation
 * - Error handling
 *
 */

var Informer = (function () {

    // This is the default configuration. These settings can be
    // modified any time by passing an object with these keys to the
    // public `setConf` method.
    var conf = {
        // Instead of sending the form data to the server, it can be
        // sent to a function. If you want to do that, then the form
        // should name the function to call in this attribute.
        elem_attr_trigger: 'action',

        // After the form submits, a function can be called with the
        // server's return. If you want to do that, then the form
        // should name the function to call in this attribute.
        elem_attr_callback: 'onreturn',

        // If a form element has this attribute, then its value will
        // not be reset when the form is cleared.
        elem_attr_fixed: 'disabled',

        // If you want to transform the form data before sending it,
        // make this a function name. If not, make it false.
        data_transform_func: JSON.stringify,

        // If the form has no `name` or `id`, then this will become
        // the key for the transformed data object. If false, no key
        // will be used.
        unnamed_form_key: null,

        // For logging.
        log: false
    };



    // If configuration settings are updated via `setConf`, then
    // this will become a backup of the defaults, which can then be
    // reinstated later.
    var conf_bk = null;



    // These are the `tagName`s to scan for in the form.
    var input_types = [
        'input', 'select', 'textarea'
    ];



    // These are the attributes to pull from the elements. They will
    // become keys to the element's value object. The `value` is
    // assumed and doesn't need to be included.
    var value_attributes = [
        'name', 'group'
    ];



    // This is the most recently submitted form. It's publicly
    // accessible, useful for callback methods.
    var last_form_called = null;



    function makeNewConf(conf_obj) {
        if (conf.log) {
            console.log("Pulling new config settings from:");
            console.log(conf_obj);
        }

        conf_bk = conf;

        var new_conf = Utils.sieve(conf, conf_obj);

        if (conf.log) {
            console.log("New config settings:");
            console.log(new_conf);
        }

        conf = new_conf;
        return conf;
    }



    function resetConfToDefault() {
        if (conf_bk) {
            if (conf.log) {
                console.log("Resetting config to default.");
            }

            conf = conf_bk;
            conf_bk = null;
        }

        else {
            if (conf.log) {
                console.log("Would reset config to default but there is no backup of the defaults.");
            }
        }

        return conf;
    }



    function stopSubmitEvent() {
        if ((window.event) && (window.event.type == 'submit')) {
            window.event.preventDefault();
        }
    }



    function getFormFromEvent(evt) {
        var event = (evt) ? evt : window.event;
        var elem = event.target || event.srcElement;
        var form = Utils.getNearestParentByTagname(elem, 'form');
        return form;
    }



    function handleAction(form) {
        if ((func = form.getAttribute(conf.elem_attr_trigger)) &&
            (winf = Utils.stringToFunction(func)) &&
            (typeof winf == 'function')) {
            last_form_called = form;
            winf(form);
        }

        else {
            // Same as the above.
            console.log("The form's `action` attribute doesn't name a function callable by Informer.");
        }
    }



    function handleSubmission(form) {
        if ((url = form.getAttribute('action')) &&
            (method = form.getAttribute('method'))) {
            // This will return false if the parameter doesn't name
            // a function, which is an acceptable callback parameter.
            var func = (chk = form.getAttribute(conf.elem_attr_callback))
                ? Utils.stringToFunction(chk)
                : null;

            var vals = toObject(form, conf.data_transform_func);
            last_form_called = form;

            Http[method]({
                url: url,
                params: vals,
                callback: func
            });
        }

        else {
            // If `conf.log` is false, then this will silently fail, and that is the suck.
            console.log("To submit, the form element needs these attributes: `action`, being the URL to send the data to, and `method`, being the HTTP verb to use, either 'get' or 'post'");
        }
    }



    function handleUpload(form) {
        if (conf.log) {
            console.log("Handling file upload.");
        }

        var frame_name = ''+new Date().getTime()+'_upload';
        form.setAttribute('target', frame_name);

        var iframe = Utils.makeElement(
            'iframe',
            {name: frame_name,
             style: 'position: absolute; top: -9000px; left: -9000px; height: 0; width: 0; overflow: hidden; visibility: hidden;'}
        );

        document.body.appendChild(iframe);

        var callback = Utils.stringToFunction(form.getAttribute(conf.elem_attr_callback)) || null;

        function pollIframe() {
            if (conf.log) {
                console.log("Polling hidden iframe for submission return.");
            }

            var bod = false;

            if (iframe.contentDocument) {
                bod = iframe.contentDocument.body.innerHTML;
            }
            else if (iframe.contentWindow) {
                bod = iframe.contentWindow.document.body.innerHTML;
            }

            if (bod) {
                document.body.removeChild(iframe);

                if (callback) {
                    if (conf.log) {
                        console.log("Sending return to callback.");
                    }

                    callback(bod);
                }

                else {return bod;}
            }

            else {window.setTimeout(pollIframe, 500);}
        }

        form.submit();
        pollIframe();

        return form;
    }



    function toObject(form, transform) {
        var vals = { };
        var key = ((k = form.getAttribute('name')) || (k = form.getAttribute('id'))) ||
            conf.unnamed_form_key;

        var valobj = (typeof transform == 'function')
            ? transform(gatherTheValues(form))
            : gatherTheValues(form);

        if (key) {
            vals[key] = valobj;
        }
        else {
            vals = valobj;
        }

        return vals;
    }



    function gatherTheValues(form) {
        last_form_called = form;
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

        if (conf.log) {
            console.log("The form's value objects:");
            console.log(vals);
        }

        return vals;
    }



    function elemToObject(elem, attrs) {
        attrs = (typeof attrs == 'undefined') ? value_attributes : attrs;

        if (conf.log) {
            console.log("Converting element to value object:");
            console.log(elem);
        }

        var obj = { };
        obj['value'] = elem.value;

        for (var o = 0, m = attrs.length; o < m; o++) {
            obj[attrs[o]] = elem.getAttribute(attrs[o]) || false;
        }

        if (conf.log) {
            console.log("Built value object:");
            console.log(obj);
        }

        return obj;
    }



    // Pass this an array of returns from `elemsToObjs`.
    function groupValues(val_objs) {
        if (conf.log) {
            console.log("Grouping values:");
            console.log(val_objs);
        }

        var vals_struct = { };

        for (var o = 0, m = val_objs.length; o < m; o++) {
            if (group_str = val_objs[o]['group']) {
                if (conf.log) {
                    console.log("'"+val_objs[o]['name']+"' group string: " + group_str);
                }

                var form_val = { };
                form_val[val_objs[o]['name']] = val_objs[o]['value'];

                var val_struct = Utils.buildNestedObject(group_str.split(':'),
                                                         form_val);

                if (conf.log) {
                    console.log("Built nested object:");
                    console.log(val_struct);
                }

                vals_struct = Utils.mergeObjects(vals_struct, val_struct);
            }

            else {
                if (conf.log) {
                    console.log("'"+val_objs[o]['name']+"' has no group, adding its value to the structure base.");
                }

                vals_struct[val_objs[o]['name']] = val_objs[o]['value'];
            }
        }

        if (conf.log) {
            console.log("Structured values:");
            console.log(vals_struct);
        }

        return vals_struct;
    }



    function clearFormValues(form) {
        if (conf.log) {
            console.log("Clearing form values, keeping '"+conf.elem_attr_fixed+"'.");
        }

        for (var o = 0, m = input_types.length; o < m; o++) {
            var elems = form.getElementsByTagName(input_types[o]);

            for (var i = 0, n = elems.length; i < n; i++) {
                if (!elems[i].hasAttribute(conf.elem_attr_fixed)) {
                    elems[1].value = '';
                }
            }
        }
    }





    /*
     * Public methods.
     */

    return {
        collect: function(form) {
            stopSubmitEvent();
            return gatherTheValues(form);
        },

        submit: function(form) {
            stopSubmitEvent();
            handleSubmission(form);
        },

        trigger: function(evt) {
            var form = getFormFromEvent(evt);
            if (form) {handleAction(form);}
        },

        upload: function(form) {
            stopSubmitEvent();
            return handleUpload(form);
        },

        clear: function(form) {
            clearFormValues(form);
        },

        tagnames: function() {
            return input_types;
        },

        form: function() {
            return last_form_called;
        },

        setConf: function(new_conf) {
            return makeNewConf(new_conf);
        },

        resetConf: function() {
            return resetConfToDefault();
        }
    }

})();
