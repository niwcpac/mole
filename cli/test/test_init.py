import sys, os

modulepath = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, modulepath)

from typer.testing import CliRunner
from unittest import mock

from cli.utils import SERVICES
from cli.cli import main

runner = CliRunner()
APP = main()


import unittest


class TestInit(unittest.TestCase):
    def setUp(self):
        self.patcher = dict()

    def create_patch(self, *args, **kwargs):
        _p = mock.patch(*args, **kwargs)
        name = args[0].split(".")[-1]
        self.patcher[name] = _p.start()

    @mock.patch("commands.init.subprocess")
    def test_default(self, p_subprocess):
        """
        Assumes Keys already exists
        Assumes configuration script already exists
        Assumes request is granted to initialize mole
        Assumes maptiles are available
        """

        self.create_patch("commands.init.SERVICES", SERVICES.copy())
        self.create_patch("commands.init.is_key_exists", return_value=True)
        self.create_patch("commands.init.generate_keys")
        self.create_patch("commands.init.standalone_backup", return_value=True)
        self.create_patch("commands.init.clean")
        self.create_patch("commands.init._build_only")
        self.create_patch("commands.init.configure_script_exists", return_value=True)
        self.create_patch("commands.init.build_angular")
        self.create_patch("builtins.input", return_value="yes")
        self.create_patch("commands.init.glob.glob", return_value=True)

        result = runner.invoke(APP, ["init"])
        assert "Backing up the database..." in result.stdout
        assert self.patcher["clean"].call_count == 0
        assert self.patcher["_build_only"].call_count == 0
        assert self.patcher["input"].call_count == 1
        assert self.patcher["build_angular"].call_count == 1
        assert "No .mbtiles tile sets available" not in result.stdout

        self.assertEqual(
            p_subprocess.call.call_args[0][0],
            [
                "find",
                "mole/media/images/",
                "-type",
                "f",
                "-not",
                "-name",
                "README",
                "-delete",
            ],
        )

        cmd_args = p_subprocess.Popen.call_args_list
        args, kwargs = cmd_args[0]
        assert "env" in kwargs
        self.assertEqual(
            list(kwargs["env"].keys()),
            [
                "PROFILE",
                "BACKUP_FLAG",
                "MAKE_MIGRATIONS",
                "POPULATE_DB",
                "NEWUSERID",
                "DEBUG_DJANGO",
                "PATH",
                "BUILD_TAG",
                "LONG_BUILD_TAG",
            ],
        )
        assert kwargs["env"]["BACKUP_FLAG"] == "false"
        assert kwargs["env"]["DEBUG_DJANGO"] == "false"
        assert kwargs["env"]["MAKE_MIGRATIONS"] == "false"

        self.assertCountEqual(
            args[0],
            [
                "docker-compose",
                "up",
                "--build",
                "--force-recreate",
                "--always-recreate-deps",
                "redis",
                "maptiles",
                "pulsar",
                "docs",
                "portainer",
                "django",
                "postgres",
                "proxy",
                "report",
                "event_generator",
            ],
        )

        assert result.exit_code == 0

    @mock.patch("commands.init.subprocess")
    def test_db_backup(self, p_subprocess):
        """
        Assumes Keys already exists
        Assumes configuration script already exists
        Assumes request is granted to initialize mole
        Assumes maptiles are available
        """

        self.create_patch("commands.init.SERVICES", SERVICES.copy())
        self.create_patch("commands.init.is_key_exists", return_value=True)
        self.create_patch("commands.init.generate_keys")
        self.create_patch("commands.init.standalone_backup", return_value=True)
        self.create_patch("commands.init.clean")
        self.create_patch("commands.init._build_only")
        self.create_patch("commands.init.configure_script_exists", return_value=True)
        self.create_patch("commands.init.build_angular")
        self.create_patch("builtins.input", return_value="yes")
        self.create_patch("commands.init.glob.glob", return_value=True)

        result = runner.invoke(APP, ["init", "--db_backup"])

        cmd_args = p_subprocess.Popen.call_args_list
        args, kwargs = cmd_args[0]
        assert "env" in kwargs
        assert "BACKUP_FLAG" in kwargs["env"].keys()
        assert kwargs["env"]["BACKUP_FLAG"] == "pre"

        p_subprocess.reset_mock()
        result = runner.invoke(APP, ["init", "-db"])
        cmd_args = p_subprocess.Popen.call_args_list
        args, kwargs = cmd_args[0]
        assert "env" in kwargs
        assert "BACKUP_FLAG" in kwargs["env"].keys()
        assert kwargs["env"]["BACKUP_FLAG"] == "pre"

        args, kwargs = cmd_args[0]
        self.assertCountEqual(
            args[0],
            [
                "docker-compose",
                "up",
                "--build",
                "--force-recreate",
                "--always-recreate-deps",
                "redis",
                "maptiles",
                "pulsar",
                "docs",
                "portainer",
                "django",
                "postgres",
                "proxy",
                "report",
                "db_backup",
                "event_generator",
            ],
        )

    @mock.patch("commands.init.subprocess")
    def test_debug(self, p_subprocess):
        """
        Assumes Keys already exists
        Assumes configuration script already exists
        Assumes request is granted to initialize mole
        Assumes maptiles are available
        """

        self.create_patch("commands.init.SERVICES", SERVICES.copy())
        self.create_patch("commands.init.is_key_exists", return_value=True)
        self.create_patch("commands.init.generate_keys")
        self.create_patch("commands.init.standalone_backup", return_value=True)
        self.create_patch("commands.init.clean")
        self.create_patch("commands.init._build_only")
        self.create_patch("commands.init.configure_script_exists", return_value=True)
        self.create_patch("commands.init.build_angular")
        self.create_patch("builtins.input", return_value="yes")
        self.create_patch("commands.init.glob.glob", return_value=True)

        result = runner.invoke(APP, ["init", "--debug"])

        cmd_args = p_subprocess.Popen.call_args_list
        args, kwargs = cmd_args[0]
        assert "env" in kwargs
        assert "DEBUG_DJANGO" in kwargs["env"].keys()
        assert kwargs["env"]["DEBUG_DJANGO"] == "true"

        p_subprocess.reset_mock()
        result = runner.invoke(APP, ["init", "-d"])
        cmd_args = p_subprocess.Popen.call_args_list
        args, kwargs = cmd_args[0]
        assert "env" in kwargs
        assert "DEBUG_DJANGO" in kwargs["env"].keys()
        assert kwargs["env"]["DEBUG_DJANGO"] == "true"

    @mock.patch("commands.init.subprocess")
    def test_pre_init_backup(self, p_subprocess):
        """
        Assumes Keys already exists
        Assumes configuration script already exists
        Assumes request is granted to initialize mole
        Assumes maptiles are available
        """

        self.create_patch("commands.init.SERVICES", SERVICES.copy())
        self.create_patch("commands.init.is_key_exists", return_value=True)
        self.create_patch("commands.init.generate_keys")
        self.create_patch("commands.init.standalone_backup", return_value=True)
        self.create_patch("commands.init.clean")
        self.create_patch("commands.init._build_only")
        self.create_patch("commands.init.configure_script_exists", return_value=True)
        self.create_patch("commands.init.build_angular")
        self.create_patch("builtins.input", return_value="yes")
        self.create_patch("commands.init.glob.glob", return_value=True)

        result = runner.invoke(APP, ["init", "--pre_init_backup"])

        # Verify standalone_backup function has not executed
        assert self.patcher["standalone_backup"].call_count == 0

    @mock.patch("commands.init.subprocess")
    def test_deep_clean(self, p_subprocess):
        """
        Assumes Keys already exists
        Assumes configuration script already exists
        Assumes request is granted to initialize mole
        Assumes maptiles are available
        """

        self.create_patch("commands.init.SERVICES", SERVICES.copy())
        self.create_patch("commands.init.is_key_exists", return_value=True)
        self.create_patch("commands.init.generate_keys")
        self.create_patch("commands.init.standalone_backup", return_value=True)
        self.create_patch("commands.init.clean")
        self.create_patch("commands.init._build_only")
        self.create_patch("commands.init.configure_script_exists", return_value=True)
        self.create_patch("commands.init.build_angular")
        self.create_patch("builtins.input", return_value="yes")
        self.create_patch("commands.init.glob.glob", return_value=True)

        result = runner.invoke(APP, ["init", "--deep-clean"])

        # Verify deep clean function executed
        assert self.patcher["clean"].call_count == 1

    @mock.patch("commands.init.subprocess")
    def test_build_only(self, p_subprocess):
        """
        Assumes Keys already exists
        Assumes configuration script already exists
        Assumes request is granted to initialize mole
        Assumes maptiles are available
        """

        self.create_patch("commands.init.SERVICES", SERVICES.copy())
        self.create_patch("commands.init.is_key_exists", return_value=True)
        self.create_patch("commands.init.generate_keys")
        self.create_patch("commands.init.standalone_backup", return_value=True)
        self.create_patch("commands.init.clean")
        self.create_patch("commands.init._build_only")
        self.create_patch("commands.init.configure_script_exists", return_value=True)
        self.create_patch("commands.init.build_angular")
        self.create_patch("builtins.input", return_value="yes")
        self.create_patch("commands.init.glob.glob", return_value=True)

        # Verify _build_only function executed
        result = runner.invoke(APP, ["init", "--build-only"])
        assert self.patcher["_build_only"].call_count == 1

        self.patcher["_build_only"].reset_mock()

        result = runner.invoke(APP, ["init", "-b"])
        assert self.patcher["_build_only"].call_count == 1

    @mock.patch("commands.init.subprocess")
    def test_deny_init(self, p_subprocess):
        """
        Assumes Keys already exists
        Assumes configuration script already exists
        Assumes request is granted to initialize mole
        Assumes maptiles are available
        """

        self.create_patch("commands.init.SERVICES", SERVICES.copy())
        self.create_patch("commands.init.is_key_exists", return_value=True)
        self.create_patch("commands.init.generate_keys")
        self.create_patch("commands.init.standalone_backup", return_value=True)
        self.create_patch("commands.init.clean")
        self.create_patch("commands.init._build_only")
        self.create_patch("commands.init.configure_script_exists", return_value=True)
        self.create_patch("commands.init.build_angular")
        self.create_patch("builtins.input", return_value="no")
        self.create_patch("commands.init.glob.glob", return_value=True)

        result = runner.invoke(APP, ["init"])

        assert len(p_subprocess.method_calls) == 0
        assert result.exit_code == 0

    @mock.patch("commands.init.subprocess")
    def test_unlock_redis(self, p_subprocess):
        """
        Assumes Keys already exists
        Assumes configuration script already exists
        Assumes request is granted to initialize mole
        Assumes maptiles are available
        """

        self.create_patch("commands.init.SERVICES", SERVICES.copy())
        self.create_patch("commands.init.is_key_exists", return_value=True)
        self.create_patch("commands.init.generate_keys")
        self.create_patch("commands.init.standalone_backup", return_value=True)
        self.create_patch("commands.init.clean")
        self.create_patch("commands.init._build_only")
        self.create_patch("commands.init.configure_script_exists", return_value=True)
        self.create_patch("commands.init.build_angular")
        self.create_patch("builtins.input", return_value="yes")
        self.create_patch("commands.init.glob.glob", return_value=True)

        result = runner.invoke(APP, ["init", "--unlock-redis"])

        cmd_args = p_subprocess.Popen.call_args_list
        args, kwargs = cmd_args[0]

        self.assertCountEqual(
            args[0],
            [
                "docker-compose",
                "-f",
                "docker-compose.yml",
                "-f",
                "docker-compose-unlocked-redis.yml",
                "up",
                "--build",
                "--force-recreate",
                "--always-recreate-deps",
                "redis",
                "maptiles",
                "pulsar",
                "docs",
                "portainer",
                "django",
                "postgres",
                "proxy",
                "report",
                "event_generator",
            ],
        )

        assert result.exit_code == 0

    @mock.patch("commands.init.subprocess")
    def test_quiet(self, p_subprocess):
        """
        Assumes Keys already exists
        Assumes configuration script already exists
        Assumes request is granted to initialize mole
        Assumes maptiles are available
        """

        self.create_patch("commands.init.SERVICES", SERVICES.copy())
        self.create_patch("commands.init.is_key_exists", return_value=True)
        self.create_patch("commands.init.generate_keys")
        self.create_patch("commands.init.standalone_backup", return_value=True)
        self.create_patch("commands.init.clean")
        self.create_patch("commands.init._build_only")
        self.create_patch("commands.init.configure_script_exists", return_value=True)
        self.create_patch("commands.init.build_angular")
        self.create_patch("builtins.input", return_value="yes")
        self.create_patch("commands.init.glob.glob", return_value=True)

        result = runner.invoke(APP, ["init", "--quiet"])
        cmd_args = p_subprocess.Popen.call_args_list
        args, kwargs = cmd_args[0]

        self.assertCountEqual(
            args[0],
            [
                "docker-compose",
                "up",
                "--build",
                "--force-recreate",
                "--always-recreate-deps",
                "-d",
                "redis",
                "maptiles",
                "pulsar",
                "docs",
                "portainer",
                "django",
                "postgres",
                "proxy",
                "report",
                "event_generator",
            ],
        )

        assert result.exit_code == 0

    @mock.patch("commands.init.subprocess")
    def test_lite(self, p_subprocess):
        """
        Assumes Keys already exists
        Assumes configuration script already exists
        Assumes request is granted to initialize mole
        Assumes maptiles are available
        """

        self.create_patch("commands.init.SERVICES", SERVICES.copy())
        self.create_patch("commands.init.is_key_exists", return_value=True)
        self.create_patch("commands.init.generate_keys")
        self.create_patch("commands.init.standalone_backup", return_value=True)
        self.create_patch("commands.init.clean")
        self.create_patch("commands.init._build_only")
        self.create_patch("commands.init.configure_script_exists", return_value=True)
        self.create_patch("commands.init.build_angular")
        self.create_patch("builtins.input", return_value="yes")
        self.create_patch("commands.init.glob.glob", return_value=True)

        result = runner.invoke(APP, ["init", "--lite"])

        cmd_args = p_subprocess.Popen.call_args_list
        args, kwargs = cmd_args[0]

        self.assertCountEqual(
            args[0],
            [
                "docker-compose",
                "up",
                "--build",
                "--force-recreate",
                "--always-recreate-deps",
                "redis",
                "maptiles",
                "django",
                "postgres",
                "report",
            ],
        )

        assert result.exit_code == 0

    @mock.patch("commands.init.subprocess")
    def test_angular(self, p_subprocess):
        """
        Assumes Keys already exists
        Assumes configuration script already exists
        Assumes request is granted to initialize mole
        Assumes maptiles are available
        """

        self.create_patch("commands.init.SERVICES", SERVICES.copy())
        self.create_patch("commands.init.is_key_exists", return_value=True)
        self.create_patch("commands.init.generate_keys")
        self.create_patch("commands.init.standalone_backup", return_value=True)
        self.create_patch("commands.init.clean")
        self.create_patch("commands.init._build_only")
        self.create_patch("commands.init.configure_script_exists", return_value=True)
        self.create_patch("commands.init.build_angular")
        self.create_patch("builtins.input", return_value="yes")
        self.create_patch("commands.init.glob.glob", return_value=True)

        result = runner.invoke(APP, ["init", "--angular"])

        cmd_args = p_subprocess.Popen.call_args_list
        args, kwargs = cmd_args[0]

        self.assertCountEqual(
            args[0],
            [
                "docker-compose",
                "up",
                "--build",
                "--force-recreate",
                "--always-recreate-deps",
                "redis",
                "maptiles",
                "pulsar",
                "docs",
                "angular",
                "portainer",
                "django",
                "postgres",
                "proxy",
                "report",
                "event_generator",
            ],
        )

        p_subprocess.reset_mock()

        result = runner.invoke(APP, ["init", "-a"])

        cmd_args = p_subprocess.Popen.call_args_list
        args, kwargs = cmd_args[0]

        self.assertCountEqual(
            args[0],
            [
                "docker-compose",
                "up",
                "--build",
                "--force-recreate",
                "--always-recreate-deps",
                "redis",
                "maptiles",
                "pulsar",
                "docs",
                "angular",
                "portainer",
                "django",
                "postgres",
                "proxy",
                "report",
                "event_generator",
            ],
        )

        p_subprocess.reset_mock()
        assert result.exit_code == 0

    @mock.patch("commands.init.subprocess")
    def test_skip_static_build(self, p_subprocess):
        """
        Assumes Keys already exists
        Assumes configuration script already exists
        Assumes request is granted to initialize mole
        Assumes maptiles are available

        #TODO Conflicts with setting angular and skip_static_build options
        """

        self.create_patch("commands.init.SERVICES", SERVICES.copy())
        self.create_patch("commands.init.is_key_exists", return_value=True)
        self.create_patch("commands.init.generate_keys")
        self.create_patch("commands.init.standalone_backup", return_value=True)
        self.create_patch("commands.init.clean")
        self.create_patch("commands.init._build_only")
        self.create_patch("commands.init.configure_script_exists", return_value=True)
        self.create_patch("commands.init.build_angular")
        self.create_patch("builtins.input", return_value="yes")
        self.create_patch("commands.init.glob.glob", return_value=True)

        result = runner.invoke(APP, ["init", "--skip_static_build"])

        cmd_args = p_subprocess.Popen.call_args_list
        args, kwargs = cmd_args[0]
        assert self.patcher["build_angular"].call_count == 0

        self.assertCountEqual(
            args[0],
            [
                "docker-compose",
                "up",
                "--build",
                "--force-recreate",
                "--always-recreate-deps",
                "redis",
                "maptiles",
                "pulsar",
                "docs",
                "portainer",
                "django",
                "postgres",
                "proxy",
                "report",
                "event_generator",
            ],
        )

        p_subprocess.reset_mock()

        result = runner.invoke(APP, ["init", "-s"])

        cmd_args = p_subprocess.Popen.call_args_list
        args, kwargs = cmd_args[0]
        assert self.patcher["build_angular"].call_count == 0

        self.assertCountEqual(
            args[0],
            [
                "docker-compose",
                "up",
                "--build",
                "--force-recreate",
                "--always-recreate-deps",
                "redis",
                "maptiles",
                "pulsar",
                "docs",
                "portainer",
                "django",
                "postgres",
                "proxy",
                "report",
                "event_generator",
            ],
        )

        p_subprocess.reset_mock()
        assert result.exit_code == 0

    @mock.patch("commands.init.subprocess")
    def test_make_migrations(self, p_subprocess):
        """
        Assumes Keys already exists
        Assumes configuration script already exists
        Assumes request is granted to initialize mole
        Assumes maptiles are available
        """

        self.create_patch("commands.init.SERVICES", SERVICES.copy())
        self.create_patch("commands.init.is_key_exists", return_value=True)
        self.create_patch("commands.init.generate_keys")
        self.create_patch("commands.init.standalone_backup", return_value=True)
        self.create_patch("commands.init.clean")
        self.create_patch("commands.init._build_only")
        self.create_patch("commands.init.configure_script_exists", return_value=True)
        self.create_patch("commands.init.build_angular")
        self.create_patch("builtins.input", return_value="yes")
        self.create_patch("commands.init.glob.glob", return_value=True)

        result = runner.invoke(APP, ["init", "--make_migrations"])

        cmd_args = p_subprocess.Popen.call_args_list
        args, kwargs = cmd_args[0]
        assert "env" in kwargs
        assert "MAKE_MIGRATIONS" in kwargs["env"].keys()
        assert kwargs["env"]["MAKE_MIGRATIONS"] == "true"

        p_subprocess.reset_mock()
        result = runner.invoke(APP, ["init", "-mm"])
        cmd_args = p_subprocess.Popen.call_args_list
        args, kwargs = cmd_args[0]
        assert "env" in kwargs
        assert "MAKE_MIGRATIONS" in kwargs["env"].keys()
        assert kwargs["env"]["MAKE_MIGRATIONS"] == "true"

    @mock.patch("commands.init.subprocess")
    def test_available_mbtiles(self, p_subprocess):
        """
        Assumes Keys already exists
        Assumes configuration script already exists
        Assumes request is granted to initialize mole
        Assumes maptiles are available
        """

        self.create_patch("commands.init.SERVICES", SERVICES.copy())
        self.create_patch("commands.init.is_key_exists", return_value=True)
        self.create_patch("commands.init.generate_keys")
        self.create_patch("commands.init.standalone_backup", return_value=True)
        self.create_patch("commands.init.clean")
        self.create_patch("commands.init._build_only")
        self.create_patch("commands.init.configure_script_exists", return_value=True)
        self.create_patch("commands.init.build_angular")
        self.create_patch("builtins.input", return_value="yes")
        self.create_patch("commands.init.glob.glob", return_value=True)

        result = runner.invoke(APP, ["init"])
        assert "maptiles" in self.patcher["SERVICES"]

        self.create_patch("commands.init.SERVICES", SERVICES.copy())
        self.create_patch("commands.init.glob.glob", return_value=False)
        p_subprocess.reset_mock()
        result = runner.invoke(APP, ["init"])
        assert "maptiles" not in self.patcher["SERVICES"]

        cmd_args = p_subprocess.Popen.call_args_list
        args, kwargs = cmd_args[0]
        self.assertCountEqual(
            args[0],
            [
                "docker-compose",
                "up",
                "--build",
                "--force-recreate",
                "--always-recreate-deps",
                "redis",
                "pulsar",
                "docs",
                "portainer",
                "django",
                "postgres",
                "proxy",
                "report",
                "event_generator",
            ],
        )

    def tearDown(self):
        mock.patch.stopall()
