
import os, sys
import subprocess

import typer
app = typer.Typer(add_completion=False)  # Create an typer appplication

CERT_CONF_DIR = os.path.join(".", "traefik", "configuration")
CA_CONF_FILE = os.path.join(CERT_CONF_DIR, "ca.config")
CERT_EXT_FILE = os.path.join(CERT_CONF_DIR, "cert.ext")
REQ_CONF_FILE = os.path.join(CERT_CONF_DIR, "req.config")

CERT_DIR = os.path.join(".", "traefik", "certificates")
CA_KEY_FILE = os.path.join(CERT_DIR, "moleCA.key")
CA_CERT_FILE = os.path.join(CERT_DIR, "moleCA.pem")
SERVER_CSR_FILE = os.path.join(CERT_DIR, "mole.csr")
SERVER_KEY_FILE = os.path.join(CERT_DIR, "mole.key")
SERVER_CERT_FILE = os.path.join(CERT_DIR, "mole.crt")


################################################################################
###                           Helper Function                                ###
################################################################################

def is_key_exists():
    if not os.path.isfile(CA_KEY_FILE):
        return False
    return True

def create_backup_file(filename):
    if os.path.isfile(filename):
        os.rename(filename, filename + ".bak")
        return True
    return False

def backup_ca_files():
    """Backup Certificate Authority (CA) Key/Certificate Files"""
    print("Backing up certificate authority certificates...")
    create_backup_file(CA_KEY_FILE)
    create_backup_file(CA_CERT_FILE)

def backup_server_files():
    """Back Up Server Key/Certificate Files"""
    print("Backing up server certificates...")
    create_backup_file(SERVER_KEY_FILE)
    create_backup_file(SERVER_CERT_FILE)
    create_backup_file(SERVER_CSR_FILE)


def generate_keys(skip_server=False, skip_ca=False):
    
    if is_key_exists():
        yes = ("yes", "y", "ye")
        prompt = """
        WARNING: You have requested to generate new certificates for serving
        via https. The old certificates and keys will be replaced.

        Do you wish to continue, replacing any existing https certificates/keys? [y/N]: """

        sys.stdout.write(prompt)

        choice = input().lower()
        if choice not in 'yes':
            return


    if not skip_ca:
        backup_ca_files()
        print("Generating certificate authority certificates...")

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
            CA_KEY_FILE,
            "-days",
            "3650",
            "-out",
            CA_CERT_FILE,
            "-config",
            CA_CONF_FILE,
        ]
        try:
            subprocess.call(
                cmd, stderr=open(os.devnull, "wb"), stdout=open(os.devnull, "wb")
            )
        except OSError:
            raise OSError(
                "Unable to generate https certificates. Do you have openssl installed?"
            )

    if not skip_server:
        backup_server_files()
        print("Generating server certificates...")

        cmd = ["openssl", "genrsa", "-out", SERVER_KEY_FILE, "2048"]
        try:
            subprocess.call(
                cmd, stderr=open(os.devnull, "wb"), stdout=open(os.devnull, "wb")
            )
        except OSError:
            raise OSError(
                "Unable to generate https certificates. Do you have openssl installed?"
            )

        cmd = [
            "openssl",
            "req",
            "-new",
            "-key",
            SERVER_KEY_FILE,
            "-out",
            SERVER_CSR_FILE,
            "-config",
            REQ_CONF_FILE,
        ]
        try:
            subprocess.call(
                cmd, stderr=open(os.devnull, "wb"), stdout=open(os.devnull, "wb")
            )
        except OSError:
            raise OSError(
                "Unable to generate https certificates. Do you have openssl installed?"
            )

        cmd = [
            "openssl",
            "x509",
            "-req",
            "-in",
            SERVER_CSR_FILE,
            "-CA",
            CA_CERT_FILE,
            "-CAkey",
            CA_KEY_FILE,
            "-CAcreateserial",
            "-out",
            SERVER_CERT_FILE,
            "-days",
            "3650",
            "-sha256",
            "-extfile",
            CERT_EXT_FILE,
        ]
        try:
            subprocess.call(
                cmd, stderr=open(os.devnull, "wb"), stdout=open(os.devnull, "wb")
            )
        except OSError:
            raise OSError(
                "Unable to generate https certificates. Do you have openssl installed?"
            )


################################################################################
###                   Typer Application Default Callback                     ###
################################################################################

description="Generate keys/certificates for serving via https"
@app.callback(invoke_without_command=True, help=description)
def keys(ctx : typer.Context,
         skip_server : bool = typer.Option(False, "--ca",show_default=False, help="Only generate Certificate Authority certificates. Do not generate server certificates."), 
         skip_ca : bool = typer.Option(False, "--server", show_default=False, help="Only generate server certificates. Do not generate Certificate Authority certificates.")):
    
    if ctx.invoked_subcommand is not None:
        return

    if not is_key_exists():
        generate_keys(skip_server, skip_ca)


################################################################################
###                          Typer Application Command                       ###
################################################################################

# @app.command()
# def command1(arg1 : bool= typer.Option(False,"-x", "--argx", help="Required Argument"),
#              arg2 : bool= typer.Option(False,"-y", "--argy", help="Optional Argument")):
#     """
#     Add Help information here
#     """
#     typer.echo("This is a command")