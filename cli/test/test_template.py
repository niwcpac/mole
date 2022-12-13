import sys, os
modulepath = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, modulepath)

from typer.testing import CliRunner
from cli.cli import main
from unittest import mock
import unittest

runner = CliRunner()
APP = main()

class TestTemplate(unittest.TestCase):
    
    @mock.patch("time.sleep")
    def test_timer(self,p_timer):
            result = runner.invoke(APP, ["template", "command1","-x"])
            assert result.exit_code == 0
            assert "This is a command True" in result.stdout

    def tearDown(self):
        pass