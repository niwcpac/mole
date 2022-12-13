import sys, os
modulepath = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, modulepath)

from typer.testing import CliRunner
from unittest import mock

from cli.cli import main

runner = CliRunner()
APP = main()


import unittest

class TestMaps(unittest.TestCase):

    def setUp(self):
        self.patcher = dict()

    def create_patch(self ,*args, **kwargs):
        _p = mock.patch(*args,**kwargs)
        name = args[0].split(".")[-1]
        self.patcher[name] = _p.start()


    @mock.patch("commands.maps.subprocess")
    def test_default(self,p_subprocess):
        result = runner.invoke(APP, ["maps"])

        assert len(p_subprocess.method_calls) == 1
        cmd_args = p_subprocess.call.call_args_list    
        args, kwargs = cmd_args[0]
    
        cmd = ["docker-compose", "up", "maptiles"]
        self.assertCountEqual(args[0], cmd)

 

    def tearDown(self):
        mock.patch.stopall()