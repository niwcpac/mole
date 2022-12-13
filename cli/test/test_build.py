import sys, os
modulepath = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, modulepath)

from typer.testing import CliRunner
from unittest import mock

from cli.cli import main

runner = CliRunner()
APP = main()


import unittest

class TestBuild(unittest.TestCase):

    def setUp(self):
        runner = CliRunner()
        APP = main()

    @mock.patch("subprocess.call")
    @mock.patch("subprocess.Popen")
    def test_default(self, p_popen, p_call):
        result = runner.invoke(APP, ["build"])
        assert p_popen.call_count == 0
        assert p_call.call_count == 0
        assert result.exit_code == 0

    @mock.patch('builtins.input', return_value="yes")
    @mock.patch("subprocess.call")
    def test_deep_clean(self, p_call,mock_input):
    
        result = runner.invoke(APP, ["build", "--deep_clean"])
        
        cmd_args = p_call.call_args_list
  
        args, kwargs = cmd_args[0]
        self.assertEqual(args[0], ["docker-compose",
                                   "down",
                                   "--volumes",
                                   "--remove-orphans",
        ])

        assert result.exit_code == 0


    @mock.patch("subprocess.call")
    def test_build_only(self, p_call):
        result = runner.invoke(APP, ["build", "--build_only"])
        
        cmd_args = p_call.call_args_list
    
        args, kwargs = cmd_args[0]
        self.assertEqual(args[0], ["docker-compose",
                                   "-f",
                                   "docker-compose.yml",
                                   "-f",
                                   "docker-compose-e2e.yml",
                                   "build",
        ])

        # env key must be in subprocess call
        assert "env" in kwargs
        self.assertEqual(list(kwargs['env'].keys()), ["PATH", "NEWUSERID", "BUILD_TAG", "LONG_BUILD_TAG"] )
        assert result.exit_code == 0


    def tearDown(self):
        pass