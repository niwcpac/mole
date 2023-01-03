import sys, os

modulepath = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, modulepath)

from typer.testing import CliRunner
from unittest import mock

from cli.cli import main

runner = CliRunner()
APP = main()


import unittest


class TestStop(unittest.TestCase):
    def setUp(self):
        self.patcher = dict()

    def create_patch(self, *args, **kwargs):
        _p = mock.patch(*args, **kwargs)
        name = args[0].split(".")[-1]
        self.patcher[name] = _p.start()

    @mock.patch("commands.stop.subprocess")
    def test_default(self, p_subprocess):

        self.create_patch("commands.stop.backup_db")

        result = runner.invoke(APP, ["stop"])

        assert len(p_subprocess.method_calls) == 1
        assert p_subprocess.Popen.call_count == 0
        assert p_subprocess.call.call_count == 1
        assert self.patcher["backup_db"].call_count == 1

        cmd_args = self.patcher["backup_db"].call_args_list
        args, kwargs = cmd_args[0]
        assert "name_string" in kwargs.keys()

        cmd_args = p_subprocess.call.call_args_list
        args, kwargs = cmd_args[0]
        cmd = ["docker", "compose", "stop"]
        self.assertCountEqual(args[0], cmd)

    def tearDown(self):
        mock.patch.stopall()
