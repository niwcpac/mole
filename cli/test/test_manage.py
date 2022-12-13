import sys, os
modulepath = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, modulepath)

from typer.testing import CliRunner
from unittest import mock

from cli.cli import main

runner = CliRunner()
APP = main()
from cli.commands import manage


import unittest

class TestManage(unittest.TestCase):

    def setUp(self):
        self.patcher = dict()

    def create_patch(self ,*args, **kwargs):
        _p = mock.patch(*args,**kwargs)
        name = args[0].split(".")[-1]
        self.patcher[name] = _p.start()

    def reset_mock(self):
        for p in self.patcher:
            self.patcher[p].reset_mock()


    @mock.patch("commands.manage.subprocess")
    def test_default(self,p_subprocess):

        self.create_patch("commands.manage.save_project_images")
        self.create_patch("commands.manage.delete_project_config")
        self.create_patch("commands.manage.import_project_containers")
        self.create_patch("commands.manage.export_project_containers")
        self.create_patch("commands.manage.run.run")
        
        result = runner.invoke(APP, ["manage"])
     
        assert self.patcher['save_project_images'].call_count == 0
        assert self.patcher['delete_project_config'].call_count == 0
        assert self.patcher['import_project_containers'].call_count == 0
        assert self.patcher['export_project_containers'].call_count == 0 
        assert self.patcher['run'].call_count == 0       
        assert len(p_subprocess.method_calls) == 0


    @mock.patch("commands.manage.subprocess")
    def test_build(self,p_subprocess):

        self.create_patch("commands.manage.save_project_images")
        self.create_patch("commands.manage.delete_project_config")
        self.create_patch("commands.manage.import_project_containers")
        self.create_patch("commands.manage.export_project_containers")
        self.create_patch("commands.manage.run.run")
        
        result = runner.invoke(APP, ["manage", "-b"])
     
        assert self.patcher['save_project_images'].call_count == 0
        assert self.patcher['delete_project_config'].call_count == 0
        assert self.patcher['import_project_containers'].call_count == 0
        assert self.patcher['export_project_containers'].call_count == 0
        assert self.patcher['run'].call_count == 1        
        assert len(p_subprocess.method_calls) == 0


        self.reset_mock()
        result = runner.invoke(APP, ["manage", "--build"])
     
        assert self.patcher['save_project_images'].call_count == 0
        assert self.patcher['delete_project_config'].call_count == 0
        assert self.patcher['import_project_containers'].call_count == 0
        assert self.patcher['export_project_containers'].call_count == 0
        assert self.patcher['run'].call_count == 1        
        assert len(p_subprocess.method_calls) == 0

    
    
    @mock.patch("commands.manage.subprocess")
    def test_save(self,p_subprocess):

        self.create_patch("commands.manage.save_project_images")
        self.create_patch("commands.manage.delete_project_config")
        self.create_patch("commands.manage.import_project_containers")
        self.create_patch("commands.manage.export_project_containers")
        self.create_patch("commands.manage.run.run")
        
        result = runner.invoke(APP, ["manage", "-s", "test"])
    
        assert self.patcher['save_project_images'].call_count == 1
        assert self.patcher['delete_project_config'].call_count == 0
        assert self.patcher['import_project_containers'].call_count == 0
        assert self.patcher['export_project_containers'].call_count == 0
        assert self.patcher['run'].call_count == 0        
        assert len(p_subprocess.method_calls) == 0

        self.reset_mock()
        result = runner.invoke(APP, ["manage", "--save", "test"])
    
        assert self.patcher['save_project_images'].call_count == 1
        assert self.patcher['delete_project_config'].call_count == 0
        assert self.patcher['import_project_containers'].call_count == 0
        assert self.patcher['export_project_containers'].call_count == 0
        assert self.patcher['run'].call_count == 0        
        assert len(p_subprocess.method_calls) == 0


    @mock.patch("commands.manage.subprocess")
    def test_imp(self,p_subprocess):

        self.create_patch("commands.manage.save_project_images")
        self.create_patch("commands.manage.delete_project_config")
        self.create_patch("commands.manage.import_project_containers")
        self.create_patch("commands.manage.export_project_containers")
        self.create_patch("commands.manage.run.run")
        
        result = runner.invoke(APP, ["manage", "-i"])
    
        assert self.patcher['save_project_images'].call_count == 0
        assert self.patcher['delete_project_config'].call_count == 0
        assert self.patcher['import_project_containers'].call_count == 1
        assert self.patcher['export_project_containers'].call_count == 0
        assert self.patcher['run'].call_count == 0        
        assert len(p_subprocess.method_calls) == 0

        self.reset_mock()
        result = runner.invoke(APP, ["manage", "--imp"])
    
        assert self.patcher['save_project_images'].call_count == 0
        assert self.patcher['delete_project_config'].call_count == 0
        assert self.patcher['import_project_containers'].call_count == 1
        assert self.patcher['export_project_containers'].call_count == 0
        assert self.patcher['run'].call_count == 0        
        assert len(p_subprocess.method_calls) == 0

    @mock.patch("commands.manage.subprocess")
    def test_exp(self,p_subprocess):

        self.create_patch("commands.manage.save_project_images")
        self.create_patch("commands.manage.delete_project_config")
        self.create_patch("commands.manage.import_project_containers")
        self.create_patch("commands.manage.export_project_containers")
        self.create_patch("commands.manage.run.run")
        
        result = runner.invoke(APP, ["manage", "-e"])
    
        assert self.patcher['save_project_images'].call_count == 0
        assert self.patcher['delete_project_config'].call_count == 0
        assert self.patcher['import_project_containers'].call_count == 0
        assert self.patcher['export_project_containers'].call_count == 1
        assert self.patcher['run'].call_count == 0        
        assert len(p_subprocess.method_calls) == 0
        print(result.stdout)
        # assert 1==0

        self.reset_mock()
        result = runner.invoke(APP, ["manage", "--exp"])
    
        assert self.patcher['save_project_images'].call_count == 0
        assert self.patcher['delete_project_config'].call_count == 0
        assert self.patcher['import_project_containers'].call_count == 0
        assert self.patcher['export_project_containers'].call_count == 1
        assert self.patcher['run'].call_count == 0        
        assert len(p_subprocess.method_calls) == 0
         
    def tearDown(self):
        mock.patch.stopall()