import sys, os
modulepath = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, modulepath)

from typer.testing import CliRunner
from unittest import mock

from cli.cli import main
from cli.utils import SERVICES
runner = CliRunner()
APP = main()


import unittest

class TestRun(unittest.TestCase):

    def setUp(self):
        self.patcher = dict()

    def create_patch(self ,*args, **kwargs):
        _p = mock.patch(*args,**kwargs)
        name = args[0].split(".")[-1]
        self.patcher[name] = _p.start()

    @mock.patch("commands.run.subprocess")
    def test_default(self,p_subprocess):
        
        self.create_patch("commands.run.os.environ.get", return_value=False)
        self.create_patch("commands.run.glob", return_value=True)
        self.create_patch("commands.run.SERVICES", SERVICES.copy())

        result = runner.invoke(APP, ["run"])

        assert p_subprocess.Popen.call_count == 1
        assert p_subprocess.call.call_count == 0
        cmd_args = p_subprocess.Popen.call_args_list    
        args, kwargs = cmd_args[0]
    
        cmd = ['docker-compose', 
               'up', 
               'proxy', 
               'pulsar', 
               'django', 
               'redis', 
               'portainer', 
               'event_generator', 
               'postgres', 
               'docs', 
               'maptiles', 
               'report']
        self.assertCountEqual(args[0], cmd)

        assert "env" in kwargs
        self.assertCountEqual(list(kwargs['env'].keys()), ["PROFILE",
                                                           "BACKUP_FLAG",
                                                           "POPULATE_DB",
                                                           "DEBUG_DJANGO",
                                                           "PATH"] )
        assert "preexec_fn" in kwargs
        assert kwargs['env']['BACKUP_FLAG'] == 'false'
        assert kwargs['env']['DEBUG_DJANGO'] == 'false'


    @mock.patch("commands.run.subprocess")
    def test_quiet1(self,p_subprocess):

        self.create_patch("commands.run.os.environ.get", return_value=False)
        self.create_patch("commands.run.glob", return_value=True)
        self.create_patch("commands.run.SERVICES", SERVICES.copy())

        result = runner.invoke(APP, ["run", "-q"])

        assert p_subprocess.Popen.call_count == 1
        assert p_subprocess.call.call_count == 0
        cmd_args = p_subprocess.Popen.call_args_list    
        args, kwargs = cmd_args[0]

        cmd = ['docker-compose', 
               'up', 
               '-d',
               'proxy', 
               'pulsar', 
               'django', 
               'redis', 
               'portainer', 
               'event_generator', 
               'postgres', 
               'docs', 
               'maptiles', 
               'report']

        self.assertCountEqual(args[0], cmd)

    @mock.patch("commands.run.subprocess")
    def test_quiet2(self,p_subprocess):

        self.create_patch("commands.run.os.environ.get", return_value=False)
        self.create_patch("commands.run.glob", return_value=True)
        self.create_patch("commands.run.SERVICES", SERVICES.copy())

        result = runner.invoke(APP, ["run", "--quiet"])

        assert p_subprocess.Popen.call_count == 1
        assert p_subprocess.call.call_count == 0
        cmd_args = p_subprocess.Popen.call_args_list    
        args, kwargs = cmd_args[0]

        cmd = ['docker-compose', 
               'up', 
               '-d',
               'proxy', 
               'pulsar', 
               'django', 
               'redis', 
               'portainer', 
               'event_generator', 
               'postgres', 
               'docs', 
               'maptiles', 
               'report']

        self.assertCountEqual(args[0], cmd)

    @mock.patch("commands.run.subprocess")
    def test_angular1(self,p_subprocess):

        self.create_patch("commands.run.os.environ.get", return_value=False)
        self.create_patch("commands.run.glob", return_value=True)
        self.create_patch("commands.run.SERVICES", SERVICES.copy())

        result = runner.invoke(APP, ["run", "-a"])

        assert p_subprocess.Popen.call_count == 1
        assert p_subprocess.call.call_count == 0
        cmd_args = p_subprocess.Popen.call_args_list    
        args, kwargs = cmd_args[0]

        cmd = ['docker-compose', 
               'up', 
               'proxy', 
               'pulsar', 
               'django', 
               'redis', 
               'portainer', 
               'event_generator', 
               'postgres', 
               'docs', 
               'maptiles', 
               'angular',
               'report']
        self.assertCountEqual(args[0], cmd)
        
    @mock.patch("commands.run.subprocess")
    def test_angular2(self,p_subprocess):

        self.create_patch("commands.run.os.environ.get", return_value=False)
        self.create_patch("commands.run.glob", return_value=True)
        self.create_patch("commands.run.SERVICES", SERVICES.copy())

        result = runner.invoke(APP, ["run", "--angular"])

        assert p_subprocess.Popen.call_count == 1
        assert p_subprocess.call.call_count == 0
        cmd_args = p_subprocess.Popen.call_args_list    
        args, kwargs = cmd_args[0]

        cmd = ['docker-compose', 
               'up', 
               'proxy', 
               'pulsar', 
               'django', 
               'redis', 
               'portainer', 
               'event_generator', 
               'postgres', 
               'docs', 
               'maptiles', 
               'angular',
               'report']
        self.assertCountEqual(args[0], cmd)

    @mock.patch("commands.run.subprocess")
    def test_nomaps(self,p_subprocess):

        self.create_patch("commands.run.os.environ.get", return_value=False)
        self.create_patch("commands.run.glob", return_value=True)
        self.create_patch("commands.run.SERVICES", SERVICES.copy())
    
        result = runner.invoke(APP, ["run", "--nomaps"])

        assert p_subprocess.Popen.call_count == 1
        assert p_subprocess.call.call_count == 0
        cmd_args = p_subprocess.Popen.call_args_list    
        args, kwargs = cmd_args[0]

        cmd = ['docker-compose', 
               'up', 
               'proxy', 
               'pulsar', 
               'django', 
               'redis', 
               'portainer', 
               'event_generator', 
               'postgres', 
               'docs', 
               'report']
        self.assertCountEqual(args[0], cmd)

    @mock.patch("commands.run.subprocess")
    def test_lite(self,p_subprocess):

        self.create_patch("commands.run.os.environ.get", return_value=False)
        self.create_patch("commands.run.glob", return_value=True)
        self.create_patch("commands.run.SERVICES", SERVICES.copy())
    
        result = runner.invoke(APP, ["run", "--lite"])

        assert p_subprocess.Popen.call_count == 1
        assert p_subprocess.call.call_count == 0
        cmd_args = p_subprocess.Popen.call_args_list    
        args, kwargs = cmd_args[0]

        cmd = ['docker-compose', 
               'up',  
               'django', 
               'redis',  
               'postgres',  
               'report',
               'maptiles']
        self.assertCountEqual(args[0], cmd)

    @mock.patch("commands.run.subprocess")
    def test_profile(self,p_subprocess):

        self.create_patch("commands.run.os.environ.get", return_value=False)
        self.create_patch("commands.run.glob", return_value=True)
        self.create_patch("commands.run.SERVICES", SERVICES.copy())
    
        result = runner.invoke(APP, ["run", "--profile"])

        assert p_subprocess.Popen.call_count == 1
        assert p_subprocess.call.call_count == 0
        cmd_args = p_subprocess.Popen.call_args_list    
        args, kwargs = cmd_args[0]

        assert "env" in kwargs
        self.assertEqual(kwargs['env']["PROFILE"], 'true')

    @mock.patch("commands.run.subprocess")
    def test_db_backup(self,p_subprocess):

        self.create_patch("commands.run.os.environ.get", return_value=False)
        self.create_patch("commands.run.glob", return_value=True)
        self.create_patch("commands.run.SERVICES", SERVICES.copy())
    
        result = runner.invoke(APP, ["run", "--db_backup"])
   
        assert p_subprocess.Popen.call_count == 1
        assert p_subprocess.call.call_count == 0
        cmd_args = p_subprocess.Popen.call_args_list    
        args, kwargs = cmd_args[0]

        assert "env" in kwargs
        self.assertEqual(kwargs['env']["BACKUP_FLAG"], 'true')

        p_subprocess.reset_mock()
        result = runner.invoke(APP, ["run", "-db"])
        cmd_args = p_subprocess.Popen.call_args_list    
        args, kwargs = cmd_args[0]

        assert "env" in kwargs
        self.assertEqual(kwargs['env']["BACKUP_FLAG"], 'true')


    @mock.patch("commands.run.subprocess")
    def test_debug(self,p_subprocess):

        self.create_patch("commands.run.os.environ.get", return_value=False)
        self.create_patch("commands.run.glob", return_value=True)
        self.create_patch("commands.run.SERVICES", SERVICES.copy())
    
        result = runner.invoke(APP, ["run", "--debug"])
   
        assert p_subprocess.Popen.call_count == 1
        assert p_subprocess.call.call_count == 0
        cmd_args = p_subprocess.Popen.call_args_list    
        args, kwargs = cmd_args[0]

        assert "env" in kwargs
        self.assertEqual(kwargs['env']["DEBUG_DJANGO"], 'true')

        p_subprocess.reset_mock()
        result = runner.invoke(APP, ["run", "-d"])
        cmd_args = p_subprocess.Popen.call_args_list    
        args, kwargs = cmd_args[0]

        assert "env" in kwargs
        self.assertEqual(kwargs['env']["DEBUG_DJANGO"], 'true')
  
    @mock.patch("commands.run.subprocess")
    def test_unlock_redis(self,p_subprocess):

        self.create_patch("commands.run.os.environ.get", return_value=False)
        self.create_patch("commands.run.glob", return_value=True)
        self.create_patch("commands.run.SERVICES", SERVICES.copy())
    
        result = runner.invoke(APP, ["run", "--unlock_redis"])
   
        assert p_subprocess.Popen.call_count == 1
        assert p_subprocess.call.call_count == 0
        cmd_args = p_subprocess.Popen.call_args_list    
        args, kwargs = cmd_args[0]
    
        cmd = ['docker-compose',
               '-f',
               'docker-compose.yml',
               '-f',
               'docker-compose-unlocked-redis.yml',
               'up',
               'proxy', 
               'pulsar', 
               'django', 
               'redis', 
               'portainer', 
               'event_generator', 
               'postgres', 
               'docs', 
               'maptiles', 
               'report']
        self.assertCountEqual(args[0], cmd)

        assert "env" in kwargs
        self.assertCountEqual(list(kwargs['env'].keys()), ["PROFILE",
                                                           "BACKUP_FLAG",
                                                           "POPULATE_DB",
                                                           "DEBUG_DJANGO",
                                                           "PATH"] )
        assert "preexec_fn" in kwargs
        assert kwargs['env']['BACKUP_FLAG'] == 'false'
        assert kwargs['env']['DEBUG_DJANGO'] == 'false'

    def tearDown(self):
        mock.patch.stopall()