import sys, os
modulepath = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, modulepath)

from typer.testing import CliRunner
from unittest import mock

from cli.cli import main

runner = CliRunner()
APP = main()


import unittest


class TestAng(unittest.TestCase):

    def setUp(self):
        self.patcher = dict()

    def create_patch(self ,*args, **kwargs):
        _p = mock.patch(*args,**kwargs)
        name = args[0].split(".")[-1]
        self.patcher[name] = _p.start()

    @mock.patch("commands.ang.subprocess")
    def test_default(self, p_subprocess):

        self.create_patch("commands.ang.build_angular")
        self.create_patch("commands.ang.service_is_running", return_value=True)
        
        result = runner.invoke(APP, ["ang"])

        assert self.patcher['build_angular'].call_count == 0
        assert self.patcher['service_is_running'].call_count == 0

        cmd_args = p_subprocess.call.call_args[0][0]
        assert result.exit_code == 0
        self.assertEqual(cmd_args, ["docker-compose", "up", "angular"])


    @mock.patch("commands.ang.subprocess")
    def test_build1(self, p_subprocess):

        self.create_patch("commands.ang.build_angular")
        self.create_patch("commands.ang.service_is_running", return_value=True)
    
        # Case 1
        result = runner.invoke(APP, ["ang", "--build"])

        assert self.patcher['build_angular'].call_count == 1
        assert self.patcher['service_is_running'].call_count == 1
        assert len(p_subprocess.method_calls) == 1

        cmd_args = p_subprocess.call.call_args_list
        args, kwargs = cmd_args[0]
        self.assertEqual(args[0],['docker-compose', 'exec', 'django', './manage.py', 'collectstatic', '--no-input'])

        # Case 2
        p_subprocess.reset_mock()
        self.patcher['build_angular'].reset_mock()
        self.patcher['service_is_running'].reset_mock()

        result = runner.invoke(APP, ["ang", "-b"])
        assert self.patcher['build_angular'].call_count == 1
        assert self.patcher['service_is_running'].call_count == 1
        assert len(p_subprocess.method_calls) == 1

        cmd_args = p_subprocess.call.call_args_list
        args, kwargs = cmd_args[0]
        self.assertEqual(args[0],['docker-compose', 'exec', 'django', './manage.py', 'collectstatic', '--no-input'])

        # Case 3
        p_subprocess.reset_mock()
        self.patcher['build_angular'].reset_mock()
        self.patcher['service_is_running'].reset_mock()
        self.create_patch("commands.ang.service_is_running", return_value=False)

        result = runner.invoke(APP, ["ang", "-b"])

        assert self.patcher['build_angular'].call_count == 1
        assert self.patcher['service_is_running'].call_count == 1
        assert len(p_subprocess.method_calls) == 3

        cmd_args = p_subprocess.call.call_args_list
        args, kwargs = cmd_args[0]
        self.assertEqual(args[0],["docker-compose", "up", "-d", "django"])

        cmd_args = p_subprocess.call.call_args_list
        args, kwargs = cmd_args[1]
        self.assertEqual(args[0],['docker-compose', 'exec', 'django', './manage.py', 'collectstatic', '--no-input'])

        cmd_args = p_subprocess.call.call_args_list
        args, kwargs = cmd_args[2]
        self.assertEqual(args[0],["docker-compose", "stop", "django", "postgres", "redis"])

        assert result.exit_code == 0

    def test_build_angular(self):
        from cli.commands import ang
        with mock.patch("commands.ang.subprocess.call") as p_subprocess:
            ang.build_angular()

            cmd_args = p_subprocess.call_args_list
            args, kwargs = cmd_args[0]
            self.assertEqual(args[0], ["docker-compose",
                                       "run",
                                       "--rm",
                                       "--entrypoint",
                                       "ng",
                                       "angular",
                                       "build",
                                       "--configuration",
                                       "production",
                                       "--base-href",
                                       "static/"])


    def tearDown(self):
        mock.patch.stopall()