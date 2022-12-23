import sys, os
modulepath = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, modulepath)

from typer.testing import CliRunner
from unittest import mock

from cli.cli import main

runner = CliRunner()

APP = main()

import unittest


class TestDocs(unittest.TestCase):

    def setUp(self):
        self.patcher = dict()

    def create_patch(self ,*args, **kwargs):
        _p = mock.patch(*args,**kwargs)
        name = args[0].split(".")[-1]
        self.patcher[name] = _p.start()

    @mock.patch("commands.docs.subprocess")
    def test_default(self, p_subprocess):
        
        # Case 1: Default build only argument
        result = runner.invoke(APP, ["docs"])
        assert len(p_subprocess.calls.method_calls) == 0

        cmd_args = p_subprocess.Popen.call_args[0][0]
        assert result.exit_code == 0
        self.assertEqual(cmd_args, ['docker-compose', 
                                    '-f', 
                                    'docker-compose.yml', 
                                    '-f', 
                                    'docker-compose-docs-livereload-override.yml', 
                                    'up', 
                                    'docs', 
                                    'proxy'])
                            

    @mock.patch("commands.docs.subprocess")
    def test_build_only(self, p_subprocess):

        cmd = ["docker-compose", 
               "run", 
               "--entrypoint", 
               '""', 
               "docs", 
               "mkdocs", 
               "build"
               ]

        result = runner.invoke(APP, ["docs", "--build_only"])
        cmd_args = p_subprocess.call.call_args[0][0]
        assert result.exit_code == 0
        self.assertEqual(cmd_args, cmd)

        p_subprocess.reset_mock()
        result = runner.invoke(APP, ["docs", "-b"])
        cmd_args = p_subprocess.call.call_args[0][0]
        assert result.exit_code == 0
        self.assertEqual(cmd_args, cmd)

    
    @mock.patch("commands.docs.subprocess")
    def test_generate_schema(self, p_subprocess):

        self.create_patch("commands.docs.closing")
        self.create_patch("commands.docs.urlopen")
        
        cmd1 = [
            "docker-compose",
            "-f",
            "docker-compose.yml",
            "-f",
            "docker-compose-docs-livereload-override.yml",
            "up",
            "django",
        ]

        cmd2 = ["docker-compose",
                            "exec",
                            "django",
                            "python",
                            "manage.py",
                            "generateschema",
                            "--file",
                            "openapi_schema.yml",
                            ]
        
        result = runner.invoke(APP, ["docs", "--generate-schema"])

        cmd_args = p_subprocess.Popen.call_args_list
        args, kwargs = cmd_args[0]
        self.assertEqual(args[0], cmd1)

        cmd_args = p_subprocess.call.call_args_list
        args, kwargs = cmd_args[0]
        assert result.exit_code == 0
        self.assertEqual(args[0], cmd2)


        p_subprocess.reset_mock()

        result = runner.invoke(APP, ["docs", "-s"])

        cmd_args = p_subprocess.call.call_args_list
        args, kwargs = cmd_args[0]
        assert result.exit_code == 0
        self.assertEqual(args[0], cmd2)

        cmd_args = p_subprocess.Popen.call_args_list
        args, kwargs = cmd_args[0]
        self.assertEqual(args[0], cmd1)

    @mock.patch("commands.docs.subprocess")
    def test_graph_models(self, p_subprocess):

        self.create_patch("commands.docs.closing")
        self.create_patch("commands.docs.urlopen")
        
        cmd1 = [
            "docker-compose",
            "-f",
            "docker-compose.yml",
            "-f",
            "docker-compose-docs-livereload-override.yml",
            "up",
            "django",
        ]

        cmd2 = ["docker-compose",
                "exec",
                "django",
                "python",
                "manage.py",
                "graph_models",
                "-a",
                "-g",
                "-o",
                "mole_models_graph.png",
                        ]
        
        result = runner.invoke(APP, ["docs", "--graph-models"])

        cmd_args = p_subprocess.Popen.call_args_list
        args, kwargs = cmd_args[0]
        self.assertEqual(args[0], cmd1)

        cmd_args = p_subprocess.call.call_args_list
        args, kwargs = cmd_args[0]
        assert result.exit_code == 0
        self.assertEqual(args[0], cmd2)


        p_subprocess.reset_mock()
        
        result = runner.invoke(APP, ["docs", "-g"])

        cmd_args = p_subprocess.call.call_args_list
        args, kwargs = cmd_args[0]
        assert result.exit_code == 0
        self.assertEqual(args[0], cmd2)

        cmd_args = p_subprocess.Popen.call_args_list
        args, kwargs = cmd_args[0]
        self.assertEqual(args[0], cmd1)
        
    def tearDown(self):
        mock.patch.stopall()