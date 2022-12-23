import sys, os
modulepath = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, modulepath)

from typer.testing import CliRunner
from unittest import mock

from cli.cli import main

runner = CliRunner()
APP = main()


import unittest

class TestTest(unittest.TestCase):

    def setUp(self):
        self.patcher = dict()

    def create_patch(self ,*args, **kwargs):
        _p = mock.patch(*args,**kwargs)
        name = args[0].split(".")[-1]
        self.patcher[name] = _p.start()


    @mock.patch("commands.test.subprocess")
    def test_default(self,p_subprocess):

        self.create_patch("commands.test.standalone_backup")
        
        result = runner.invoke(APP, ["test"])

        assert len(p_subprocess.method_calls) == 1
        assert p_subprocess.Popen.call_count == 1
        assert p_subprocess.call.call_count == 0
        assert self.patcher["standalone_backup"].call_count == 0

        cmd_args = p_subprocess.Popen.call_args_list    
        args, kwargs = cmd_args[0]
        cmd = ["docker-compose",
               "-f",
               "docker-compose-tests.yml",
               "up",
                ]       
        self.assertCountEqual(args[0], cmd)

    @mock.patch("commands.test.subprocess")
    def test_dropdb(self,p_subprocess):

        self.create_patch("commands.test.standalone_backup")
        
        result = runner.invoke(APP, ["test", "--dropdb"])

        assert len(p_subprocess.method_calls) == 2
        assert p_subprocess.Popen.call_count == 0
        assert p_subprocess.call.call_count == 2
        assert self.patcher["standalone_backup"].call_count == 0

        cmd_args = p_subprocess.call.call_args_list    
        args, kwargs = cmd_args[0]
        cmd = ["docker-compose", "-f", "compose_init_db.yml", "up", "-d", "postgres"]    
        self.assertCountEqual(args[0], cmd)
      
        args, kwargs = cmd_args[1]
        cmd = [
            "docker-compose",
            "exec",
            "postgres",
            "dropdb",
            "--username=mole_user",
            "test_mole",
        ]    
        self.assertCountEqual(args[0], cmd)
      
        assert result.exit_code == 0
    
    @mock.patch("commands.test.subprocess")
    def test_integration(self,p_subprocess):

        self.create_patch("commands.test.standalone_backup")
        
        result = runner.invoke(APP, ["test", "--integration"])

        assert len(p_subprocess.method_calls) == 1
        assert p_subprocess.Popen.call_count == 1
        assert p_subprocess.call.call_count == 0
        assert self.patcher["standalone_backup"].call_count == 1

        cmd_args = p_subprocess.Popen.call_args_list    
        args, kwargs = cmd_args[0]
        cmd = [
            "docker-compose",
            "-f",
            "docker-compose-e2e.yml",
            "-f",
            "docker-compose.yml",
            "up",
            "--force-recreate",
            "--renew-anon-volumes",
            "--abort-on-container-exit",
            "--exit-code-from",
            "django",
        ]
        self.assertCountEqual(args[0], cmd)
        assert "env" in kwargs.keys()

        self.assertCountEqual(list(kwargs['env'].keys()), ["PROFILE",
                                                            "BACKUP_FLAG",
                                                            "MAKE_MIGRATIONS",
                                                            "POPULATE_DB",
                                                            "NEWUSERID",
                                                            "DEBUG_DJANGO",
                                                            "PATH" ])

        assert result.exit_code == 0
 

    def tearDown(self):
        mock.patch.stopall()