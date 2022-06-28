import sys
import os
import traceback
import stat
import logging

from dash.dependencies import Input, Output, State

# from flask_caching import Cache
from report_generator.data import graph_functions

if not os.path.exists("log"):
    os.mkdir("log")
    os.chmod("log", stat.S_IRWXU | stat.S_IRWXG | stat.S_IRWXO)


class baseApp(object):
    def __init__(
        self, app, server, title, loglevel=logging.ERROR, use_cache=False,
    ):
        self.app = app
        self.server = server
        self.title = title
        self.logger = logging.getLogger(__name__ + "." + self.__class__.__name__)

        logging.basicConfig(
            filename=f"./log/_{self.__class__.__name__}.log",
            filemode="w",
            level=loglevel,
            format="%(asctime)s %(levelname)s:%(message)s",
            datefmt="%d/%m/%Y %H:%M:%S ",
        )
        self.logger.debug("init app")
        self.output_list = None

        # if use_cache is True:
        #     self.init_cache()

    def init_cache(self):
        # self.cache = Cache(
        #     self.app.server,
        #     config={'CACHE_TYPE': 'filesystem','CACHE_DIR':'./cache/'+self.name}
        # )
        # return self
        pass

    def get_component_id(self, name):
        return "{name}".format(name=name)

    def register_callbacks(self, callbacks):
        for callback_data in callbacks:
            dynamically_generated_function = self.create_callback(
                callback_data[0], callback_data[3]
            )
            self.app.callback(output=callback_data[0], inputs=callback_data[1])(
                dynamically_generated_function
            )

    def print_exception(self, e, ctx, name, *params):
        print("Exception in {name} : {msg}".format(name=name, msg=e))
        print("Exception parameters:", *params)
        exc_type, exc_obj, exc_tb = sys.exc_info()
        traceback.print_tb(exc_tb)

    def create_callback(self, output_element, retfunc):
        """Creates a callback function"""

        def callback(*input_values):
            retval = []
            if input_values is not None and input_values != "None":
                try:
                    retval = retfunc(output_element.component_id, *input_values)
                except Exception as e:
                    exc_type, exc_obj, exc_tb = sys.exc_info()
                    fname = traceback.extract_tb(exc_tb, 1)[0][2]
                    filename = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
                    print(
                        "Callback Exception: ",
                        e,
                        exc_type,
                        filename,
                        exc_tb.tb_lineno,
                        fname,
                    )
                    print("parameters: ", *input_values)
                    traceback.print_tb(exc_tb)

            return retval

        return callback

    def define_callback(
        self, output, input, func=None, state=None, event=None,
    ):
        return (
            Output(self.get_component_id(output[0]), output[1]),
            [Input(self.get_component_id(id), attr) for (id, attr) in input],
            []
            if state is None
            else [State(self.get_component_id(id), attr) for (id, attr) in state],
            self.default_report_callback if func is None else func,
        )

    def api_report_callback(self, *input_data):
        get_graph_function = getattr(graph_functions, input_data[0])

        return get_graph_function(
            endpoint=input_data[3],
            trial=input_data[4],
            font_color=None,
            plot_color="white",
            height=650,
            width=None,
        )[0]

    def csv_report_callback(self, *input_data):
        get_graph_function = getattr(graph_functions, input_data[0])
        return get_graph_function(
            data=input_data[2],
            filename=input_data[3],
            font_color=None,
            plot_color="white",
            height=650,
            width=None,
        )[0]
