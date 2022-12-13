import sys, os
modulepath = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, modulepath)

from typer.testing import CliRunner
from unittest import mock

from cli.cli import main
from cli.commands import keys

runner = CliRunner()
APP = main()



import unittest

class TestKeys(unittest.TestCase):

    def setUp(self):
        self.patcher = dict()

    def create_patch(self ,*args, **kwargs):
        _p = mock.patch(*args,**kwargs)
        name = args[0].split(".")[-1]
        self.patcher[name] = _p.start()


    @mock.patch("commands.keys.subprocess")
    def test_key_exists(self,p_subprocess):
        """
        Assumes keys already exists
        """
        self.create_patch("commands.keys.is_key_exists", return_value=True)
        self.create_patch("commands.keys.generate_keys")

        result = runner.invoke(APP, ["keys"])

        assert self.patcher['is_key_exists'].call_count == 1 
        assert self.patcher['generate_keys'].call_count == 0
    

    @mock.patch("commands.keys.subprocess")
    def test_key_not_exists(self,p_subprocess):
        """
        Assumes keys do not exists
        """
        self.create_patch("commands.keys.is_key_exists", return_value=False)
        self.create_patch("commands.keys.generate_keys")
        result = runner.invoke(APP, ["keys"])

        assert self.patcher['is_key_exists'].call_count == 1 
        assert self.patcher['generate_keys'].call_count == 1
    

    @mock.patch("commands.keys.subprocess")
    def test_generate_keys_user_input1(self,p_subprocess):

        self.create_patch("cli.commands.keys.is_key_exists", return_value=True)
        self.create_patch("builtins.input", return_value="no")
        
        keys.generate_keys(skip_server=False, skip_ca=False)
        assert self.patcher["is_key_exists"].call_count == 1
        assert len(p_subprocess.method_calls) == 0


    @mock.patch("commands.keys.subprocess")
    def test_generate_keys_user_input2(self,p_subprocess):

        self.create_patch("cli.commands.keys.is_key_exists", return_value=True)
        self.create_patch("builtins.input", return_value="yes")
        keys.generate_keys(skip_server=False, skip_ca=False)
        assert self.patcher["is_key_exists"].call_count == 1
        assert len(p_subprocess.method_calls) == 0

    @mock.patch("commands.keys.subprocess")
    def test_generate_backup_server_keys(self,p_subprocess):

        self.create_patch("cli.commands.keys.is_key_exists", return_value=False) # Skip File Verification
        self.create_patch("cli.commands.keys.os.path.isfile", return_value=True)
        self.create_patch("cli.commands.keys.create_backup_file")
        self.create_patch("cli.commands.keys.os.rename")
    

        keys.generate_keys(skip_server=False, skip_ca=True)
        assert self.patcher["is_key_exists"].call_count == 1
        assert self.patcher['create_backup_file'].call_count == 3
        func_args = self.patcher['create_backup_file'].call_args_list
        
        ext = list()
        for args, kwargs in func_args:
            ext.append(args[0].split(".")[-1])
        self.assertCountEqual( ext, ["key","crt","csr"])

    @mock.patch("commands.keys.subprocess")
    def test_generate_backup_ca_keys(self,p_subprocess):

        self.create_patch("cli.commands.keys.is_key_exists", return_value=False) # Skip File Verification
        self.create_patch("cli.commands.keys.os.path.isfile", return_value=True)
        self.create_patch("cli.commands.keys.create_backup_file")
        self.create_patch("cli.commands.keys.os.rename")
    

        keys.generate_keys(skip_server=True, skip_ca=False)
        assert self.patcher["is_key_exists"].call_count == 1
        assert self.patcher['create_backup_file'].call_count == 2
        func_args = self.patcher['create_backup_file'].call_args_list
        
        ext = list()
        for args, kwargs in func_args:
            ext.append(args[0].split(".")[-1])
        self.assertCountEqual( ext, ["key","pem"])
     
    @mock.patch("cli.commands.keys.subprocess")
    def test_generate_server_keys(self,p_subprocess):

        self.create_patch("cli.commands.keys.is_key_exists", return_value=False) # Skip File Verification
        self.create_patch("cli.commands.keys.backup_server_files")
    
        keys.generate_keys(skip_server=False, skip_ca=True)

        cmd_args = p_subprocess.call.call_args_list
        args, kwargs = cmd_args[0]

        cmd = ["openssl", "genrsa", "-out", keys.SERVER_KEY_FILE, "2048"]
        self.assertCountEqual(args[0], cmd)
        self.assertCountEqual(list(kwargs.keys()), ['stderr' , 'stdout'])

        cmd = [
            "openssl",
            "req",
            "-new",
            "-key",
            keys.SERVER_KEY_FILE,
            "-out",
            keys.SERVER_CSR_FILE,
            "-config",
            keys.REQ_CONF_FILE,
        ]

        args, kwargs = cmd_args[1]
        self.assertCountEqual(args[0], cmd)


    @mock.patch("cli.commands.keys.subprocess")
    def test_generate_ca_keys(self,p_subprocess):

        self.create_patch("cli.commands.keys.is_key_exists", return_value=False) # Skip File Verification
        self.create_patch("cli.commands.keys.backup_server_files")
    
        keys.generate_keys(skip_server=True, skip_ca=False)

        cmd_args = p_subprocess.call.call_args_list
        args, kwargs = cmd_args[0]

        cmd = [
            "openssl",
            "req",
            "-new",
            "-x509",
            "-newkey",
            "rsa:2048",
            "-sha256",
            "-nodes",
            "-keyout",
            keys.CA_KEY_FILE,
            "-days",
            "3650",
            "-out",
            keys.CA_CERT_FILE,
            "-config",
            keys.CA_CONF_FILE,
        ]
        self.assertCountEqual(args[0], cmd)

        self.assertCountEqual(list(kwargs.keys()), ['stderr' , 'stdout'])


    def tearDown(self):
        mock.patch.stopall()