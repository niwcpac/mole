"""
Parameterized test metaclass.
From https://gist.github.com/simonw/6aaab51f84f163f3a675
"""


class NamedParameterizedTestsMeta(type):
    def __new__(cls, name, bases, attrs):
        skip_these_names = []
        new_attrs = {}
        for name, fn in attrs.items():
            if (
                name.startswith("test_")
                and callable(fn)
                and getattr(fn, "_parameterized_params", None)
            ):
                skip_these_names.append(name)
                for params in fn._parameterized_params:
                    new_attrs[
                        "%s_%s" % (name, params[0])
                    ] = cls.make_parameterized_test(fn, params)
        # new_attrs = dict([pair for pair in attrs.items() if pair[0] not in skip_these_names])
        return super(NamedParameterizedTestsMeta, cls).__new__(
            cls, name, bases, new_attrs
        )

    @classmethod
    def make_parameterized_test(cls, fn, params):
        def test_fn(self):
            fn(self, params)

        return test_fn


def parameterized(*params):
    def decorator(fn):
        fn._parameterized_params = params
        return fn

    return decorator
