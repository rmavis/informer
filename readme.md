# INFORMER

This module processes forms. Its main function is to generate an
object representing the form data. It can then handle that data
in a variety of ways.


## Usage

When this form is submitted:
```
<form action="/api/users" method="post" onsubmit="Informer.submit(this)">
  <input name="email" value="what@evv.err" />
  <input name="password" value="so clever" />
  <input type="submit" name="submit" value="Make it so" />
</form>
```

it will `POST` the standard data:
```
email=what@evv.err&password=so%20&submit=Make%20it%20so
```

to `/api/users`, and then receive the response.

But say you want to package the data as JSON before submitting
it. You can gather the data from the form, use the name of the
form itself as a key, and run the resulting data object through
`JSON.stringify`.

When this form is submitted:
```
<form action="/api/users" method="post" onsubmit="Informer.submit(this)" name="new-user" onreturn="handler">
  <input name="email" value="what@evv.err" />
  <input name="password" value="so clever" />
  <input type="submit" name="submit" value="Make it so" />
</form>
```

it will build this JSON:
```
{new-user:
  {email: "what@evv.err", password: "so clever"},
  submit:"Make it so"
}
```

then POST that to `/api/users`, and then pass the return to
the `handler` function.

So Informer is fine as a standard form handler but shines when
used to generate more complex data objects and pass those objects
to the server as JSON.


## Dependencies

- [Http.js](https://github.com/rmavis/http) for handling the HTTP requests
- [Utils.js](https://github.com/rmavis/utils.js) for utility functions


## Details

Values from the form can be grouped with a `group` attribute on
the input elements, and those groups can be arbitrarily complex
by separating the group names with a colon. So these inputs:
```
<input group="login" name="email" value="what@evv.err" />
<input group="login" name="password" value="so clever" />
<input group="personal" name="f_name" value="Taylor" />
<input group="personal" name="l_name" value="Swift" />
```

will generate:
```
{login:
  {email: "what@evv.err", password: "so clever"}
},
{personal: {f_name: "Taylor", l_name: "Swift"} }
```

and these inputs:
```
<input group="user:login" name="email" value="what@evv.err" />
<input group="user:login" name="password" value="so clever" />
<input group="user:personal" name="f_name" value="Taylor" />
<input group="user:personal" name="l_name" value="Swift" />
```

will generate:
```
{user:
  {login:
    {email: "what@evv.err", password: "so clever"}
  },
  {personal:
    {f_name: "Taylor", l_name: "Swift"}
  }
}
```

If the form has an `onreturn` attribute (that name is set by the
value of `conf.elem_attr_callback`), then after it is submitted,
the server's return will be passed to that function.

There are ten public methods: `collect`, `submit`, `trigger`,
`upload`, `partial`, `clear`, `tagnames`,  `form`, `setConf`, and
`resetConf`.

The `collect` and `submit` methods both generate the data object.
The `collect` method will return that object, and `submit` will
send it to the URL indicated by the form's `action` attribute via
the method specified by the form's `method` attribute, as you
might expect from those standard attributes. If a function is
named in `conf.data_transform_func`, then the data object will be
passed to that before submitting.

The `trigger` method will parse the form, build a data object,
and pass that object to the function named in the form's `action`
attribute (if you'd like, you can specify a different attribute
name in `conf.elem_attr_trigger`).

The `upload` method will upload a file.

The `partial` method will collect and submit a partial form.

The `clear` method will clear the form values.

The `tagnames` and `form` methods return the tagnames to read
from the form and the last form read, respectively.

The `setConf` and `resetConf` methods set the configuration object
and rest the configuration to the default, respectively.


## Todo

- Input validation
- Error handling
