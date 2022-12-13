import sys, os
modulepath = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, modulepath)

from typer.testing import CliRunner
from unittest import mock

from cli.cli import main

runner = CliRunner()
APP = main()


import unittest

class TestDjango(unittest.TestCase):

    def setUp(self):
        runner = CliRunner()
        APP = main()

    @mock.patch("commands.db.service_is_running")
    @mock.patch("subprocess.call")
    def test_default(self, p_call, p_service_is_running):
    
        p_service_is_running.side_effect = [(False,123)]
        m_calls = mock.Mock()
        m_calls("django", id=True)
        
        result = runner.invoke(APP, ["django"])
        
        cmd_args = p_call.call_args_list

        assert len(cmd_args) == 0
        assert result.exit_code == 0

    @mock.patch("commands.django.service_is_running")
    @mock.patch("subprocess.call")
    def test_make_migration1(self, p_call, p_service_is_running):
    
        # Mock Django Service Not running
        dj_container_id = 123
        p_service_is_running.side_effect = [(False,dj_container_id)]
        m_calls = mock.Mock()
        m_calls("django", id=True)
        
        result = runner.invoke(APP, ["django", "-mm"])
        cmd_args = p_call.call_args_list

        assert len(cmd_args) == 0
        assert result.exit_code == 0

    @mock.patch("commands.django.service_is_running")
    @mock.patch("subprocess.call")
    def test_make_migration2(self, p_call, p_service_is_running):
    
        # Mock Django Service running
        dj_container_id = 123
        p_service_is_running.side_effect = [(True,dj_container_id)]
        m_calls = mock.Mock()
        m_calls("django", id=True)
        
        result = runner.invoke(APP, ["django", "-mm"])
        cmd_args = p_call.call_args_list
       
        args, kwargs = cmd_args[0]
        self.assertEqual(args[0], f"docker exec -it {123} ./manage.py makemigrations")

        assert len(cmd_args) == 1
        assert result.exit_code == 0

    @mock.patch("commands.django.service_is_running")
    @mock.patch("subprocess.call")
    def test_make_migration3(self, p_call, p_service_is_running):
    
        # Mock Django Service Not running
        dj_container_id = 123
        p_service_is_running.side_effect = [(False,dj_container_id)]
        m_calls = mock.Mock()
        m_calls("django", id=True)
        
        result = runner.invoke(APP, ["django", "--make_migrations"])
        cmd_args = p_call.call_args_list

        assert len(cmd_args) == 0
        assert result.exit_code == 0

    @mock.patch("commands.django.service_is_running")
    @mock.patch("subprocess.call")
    def test_make_migration4(self, p_call, p_service_is_running):
    
        # Mock Django Service running
        dj_container_id = 123
        p_service_is_running.side_effect = [(True,dj_container_id)]
        m_calls = mock.Mock()
        m_calls("django", id=True)
        
        result = runner.invoke(APP, ["django", "--make_migrations"])
        cmd_args = p_call.call_args_list
       
        args, kwargs = cmd_args[0]
        self.assertEqual(args[0], f"docker exec -it {123} ./manage.py makemigrations")

        assert len(cmd_args) == 1
        assert result.exit_code == 0


    def tearDown(self):
        pass