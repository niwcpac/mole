import sys, os

modulepath = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, modulepath)

from typer.testing import CliRunner
from unittest import mock

from cli.cli import main

runner = CliRunner()
APP = main()


import unittest


class TestDB(unittest.TestCase):
    def setUp(self):
        pass

    @mock.patch("subprocess.call")
    @mock.patch("subprocess.Popen")
    def test_default(self, p_popen, p_call):
        result = runner.invoke(APP, ["db"])
        assert result.exit_code == 0

    @mock.patch("commands.db.backup_db")
    @mock.patch("subprocess.call")
    def test_backup_test1(self, p_call, p_backup_db):

        # Mock return of backup_db
        p_backup_db.return_value = {"body": "", "status": None}

        # Mock docker services
        m_calls = mock.Mock()
        m_calls("postgres")
        m_calls("db_backup")

        # service_is_running return values
        # service_is_running("postgres") = True
        # service_is_running("db_backup") = True
        with mock.patch(
            "commands.db.service_is_running", side_effect=[False, False]
        ) as mock_method:

            result = runner.invoke(APP, ["db", "--backup"])

            mock_method.assert_has_calls(m_calls.call_args_list, any_order=False)
            cmd_args = p_call.call_args_list

            args, kwargs = cmd_args[0]
            assert "env" in kwargs
            self.assertEqual(
                list(kwargs["env"].keys()),
                ["BACKUP_FLAG", "POPULATE_DB", "NEWUSERID", "PATH"],
            )
            self.assertEqual(
                args[0], ["docker", "compose", "up", "-d", "postgres", "db_backup"]
            )

            args, kwargs = cmd_args[1]
            assert "env" in kwargs
            self.assertEqual(args[0], ["docker", "compose", "stop", "postgres"])
            self.assertEqual(
                list(kwargs["env"].keys()),
                ["BACKUP_FLAG", "POPULATE_DB", "NEWUSERID", "PATH"],
            )

            args, kwargs = cmd_args[2]
            assert "env" in kwargs
            self.assertEqual(args[0], ["docker", "compose", "stop", "db_backup"])
            self.assertEqual(
                list(kwargs["env"].keys()),
                ["BACKUP_FLAG", "POPULATE_DB", "NEWUSERID", "PATH"],
            )

            assert result.exit_code == 0

    @mock.patch("commands.db.backup_db")
    @mock.patch("subprocess.call")
    def test_backup_test2(self, p_call, p_backup_db):
        # Mock return of backup_db
        p_backup_db.return_value = {"body": "", "status": None}

        # Mock docker services
        m_calls = mock.Mock()
        m_calls("postgres")
        m_calls("db_backup")

        # service_is_running return values
        # service_is_running("postgres") = True
        # service_is_running("db_backup") = True
        with mock.patch(
            "commands.db.service_is_running", side_effect=[True, False]
        ) as mock_method:

            result = runner.invoke(APP, ["db", "--backup"])

            mock_method.assert_has_calls(m_calls.call_args_list, any_order=False)
            cmd_args = p_call.call_args_list

            args, kwargs = cmd_args[0]
            assert "env" in kwargs
            self.assertEqual(
                list(kwargs["env"].keys()),
                ["BACKUP_FLAG", "POPULATE_DB", "NEWUSERID", "PATH"],
            )
            self.assertEqual(
                args[0], ["docker", "compose", "up", "-d", "postgres", "db_backup"]
            )

            args, kwargs = cmd_args[1]
            assert "env" in kwargs
            self.assertEqual(args[0], ["docker", "compose", "stop", "db_backup"])
            self.assertEqual(
                list(kwargs["env"].keys()),
                ["BACKUP_FLAG", "POPULATE_DB", "NEWUSERID", "PATH"],
            )

            assert result.exit_code == 0

    @mock.patch("commands.db.backup_db")
    @mock.patch("subprocess.call")
    def test_backup_test3(self, p_call, p_backup_db):
        # Mock return of backup_db
        p_backup_db.return_value = {"body": "", "status": None}

        # Mock docker services
        m_calls = mock.Mock()
        m_calls("postgres")
        m_calls("db_backup")
        # service_is_running return values
        # service_is_running("postgres") = True
        # service_is_running("db_backup") = True
        with mock.patch(
            "commands.db.service_is_running", side_effect=[False, True]
        ) as mock_method:

            result = runner.invoke(APP, ["db", "--backup"])

            mock_method.assert_has_calls(m_calls.call_args_list, any_order=False)
            cmd_args = p_call.call_args_list

            args, kwargs = cmd_args[0]
            assert "env" in kwargs
            self.assertEqual(
                list(kwargs["env"].keys()),
                ["BACKUP_FLAG", "POPULATE_DB", "NEWUSERID", "PATH"],
            )
            self.assertEqual(
                args[0], ["docker", "compose", "up", "-d", "postgres", "db_backup"]
            )

            args, kwargs = cmd_args[1]
            assert "env" in kwargs
            self.assertEqual(args[0], ["docker", "compose", "stop", "postgres"])
            self.assertEqual(
                list(kwargs["env"].keys()),
                ["BACKUP_FLAG", "POPULATE_DB", "NEWUSERID", "PATH"],
            )

            assert result.exit_code == 0

    @mock.patch("commands.db.backup_db")
    @mock.patch("subprocess.call")
    def test_backup_test4(self, p_call, p_backup_db):
        # Mock return of backup_db
        p_backup_db.return_value = {"body": "", "status": None}

        # Mock docker services
        m_calls = mock.Mock()
        m_calls("postgres")
        m_calls("db_backup")

        # service_is_running return values
        # service_is_running("postgres") = True
        # service_is_running("db_backup") = True
        with mock.patch(
            "commands.db.service_is_running", side_effect=[True, True]
        ) as mock_method:

            result = runner.invoke(APP, ["db", "--backup"])

            mock_method.assert_has_calls(m_calls.call_args_list, any_order=False)
            cmd_args = p_call.call_args_list

            # Ensure no subprocess calls were made
            assert len(cmd_args) == 0
            assert result.exit_code == 0

    @mock.patch("commands.db.backup_db")
    @mock.patch("commands.db.service_is_running")
    @mock.patch("subprocess.call", return_value=mock.MagicMock())
    def test_load1(self, p_call, p_service_is_running, p_backup_db):
        """
        Testing API with non-existents mock file
        """
        filename = "/test_filename"
        p_service_is_running.side_effect = [
            (False, 123),
            False,
            (False, 123),
        ]  # [postgres : True, db_backup : False]
        p_backup_db.return_value = {"body": "", "status": None}
        # Mock docker services
        m_calls = mock.Mock()
        m_calls("postgres", id=True)
        m_calls("db_backup")
        m_calls("postgres", id=True)

        with mock.patch("os.path.isfile", return_value=False) as mock_isfile:

            result = runner.invoke(APP, ["db", "--load", filename])

            cmd_args = p_call.call_args_list

            args, kwargs = cmd_args[0]
            self.assertEqual(args[0], ["docker", "compose", "up", "-d", "postgres"])

            args, kwargs = cmd_args[1]
            assert "env" in kwargs
            self.assertEqual(list(kwargs["env"].keys()), ["BACKUP_FLAG", "PATH"])
            self.assertEqual(args[0], ["docker", "compose", "up", "-d", "db_backup"])

            assert "Not a valid file path." in result.stdout

            args, kwargs = cmd_args[2]
            assert "env" in kwargs
            self.assertEqual(args[0], ["docker", "compose", "stop", "postgres"])
            self.assertEqual(list(kwargs["env"].keys()), ["BACKUP_FLAG", "PATH"])

            args, kwargs = cmd_args[3]
            assert "env" in kwargs
            self.assertEqual(args[0], ["docker", "compose", "stop", "db_backup"])
            self.assertEqual(list(kwargs["env"].keys()), ["BACKUP_FLAG", "PATH"])

            assert result.exit_code == 0

    @mock.patch("commands.db.backup_db")
    @mock.patch("commands.db.service_is_running")
    @mock.patch("subprocess.call", return_value=mock.MagicMock())
    def test_load2(self, p_call, p_service_is_running, p_backup_db):
        """
        Testing API with existents mock file
        """
        filename = "/test_filename"
        pg_container_id = 123
        p_service_is_running.side_effect = [
            (False, pg_container_id),
            False,
            (False, pg_container_id),
        ]  # [postgres : True, db_backup : False]
        p_backup_db.return_value = {"body": "", "status": None}
        # Mock docker services
        m_calls = mock.Mock()
        m_calls("postgres", id=True)
        m_calls("db_backup")
        m_calls("postgres", id=True)

        with mock.patch("os.path.isfile", return_value=True) as mock_isfile:

            result = runner.invoke(APP, ["db", "--load", filename])
            cmd_args = p_call.call_args_list

            args, kwargs = cmd_args[0]
            self.assertEqual(args[0], ["docker", "compose", "up", "-d", "postgres"])

            args, kwargs = cmd_args[1]
            assert "env" in kwargs
            self.assertEqual(list(kwargs["env"].keys()), ["BACKUP_FLAG", "PATH"])
            self.assertEqual(args[0], ["docker", "compose", "up", "-d", "db_backup"])

            print(result.stdout)
            args, kwargs = cmd_args[2]
            self.assertEqual(
                args[0], ["cp", filename, f"db_backup/backups/{filename[1:]}.sql"]
            )
            assert "env" in kwargs
            self.assertEqual(list(kwargs["env"].keys()), ["BACKUP_FLAG", "PATH"])

            args, kwargs = cmd_args[3]
            assert "env" in kwargs

            # print(cmd_args)
            # sql_query = "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'mole';"
            self.assertEqual(
                args[0],
                [
                    "docker",
                    "compose",
                    "exec",
                    "postgres",
                    "psql",
                    "-U",
                    "mole_user",
                    "-d",
                    "postgres",
                    "-c",
                    "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'mole';",
                ],
            )
            self.assertEqual(list(kwargs["env"].keys()), ["BACKUP_FLAG", "PATH"])

            args, kwargs = cmd_args[4]

            assert "shell" in kwargs
            self.assertEqual(
                args[0],
                (
                    f'docker exec -it {pg_container_id} psql -U mole_user -d postgres -c "DROP DATABASE mole;"'
                ),
            )

            assert result.exit_code == 0

    def tearDown(self):
        pass
