import sys, os

modulepath = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, modulepath)

from typer.testing import CliRunner
from unittest import mock

from cli.cli import main

runner = CliRunner()
APP = main()


import unittest


class TestShell(unittest.TestCase):
    def setUp(self):
        self.patcher = dict()

    def create_patch(self, *args, **kwargs):
        _p = mock.patch(*args, **kwargs)
        name = args[0].split(".")[-1]
        self.patcher[name] = _p.start()

    @mock.patch("commands.shell.subprocess")
    def test_default(self, p_subprocess):

        self.create_patch("commands.shell.stop")

        result = runner.invoke(APP, ["shell"])

        assert len(p_subprocess.method_calls) == 4
        assert p_subprocess.Popen.call_count == 0
        assert p_subprocess.call.call_count == 4
        assert self.patcher["stop"].call_count == 1

        cmd_args = p_subprocess.call.call_args_list
        args, kwargs = cmd_args[0]
        cmd = ["cp", "docker-compose.yml", "compose_init_db.yml"]
        self.assertCountEqual(args[0], cmd)

        args, kwargs = cmd_args[1]
        cmd = ["sed", "-i", "-e", "s/init/init_shell/g", "compose_init_db.yml"]
        self.assertCountEqual(args[0], cmd)

        args, kwargs = cmd_args[2]
        cmd = ["docker", "compose", "-f", "compose_init_db.yml", "up", "-d"]
        self.assertCountEqual(args[0], cmd)

        args, kwargs = cmd_args[3]
        cmd = ["docker", "compose", "exec", "django", "/bin/bash"]
        self.assertCountEqual(args[0], cmd)

    def tearDown(self):
        mock.patch.stopall()
