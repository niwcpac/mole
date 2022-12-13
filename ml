#!/usr/bin/env python3

import os
import sys
import subprocess


def main():
    cmd = [
        "poetry",
        "run",
        "python",
        "-c",
        "from cli.utils import install_poetry_env; install_poetry_env()",
    ]
    subprocess.call(cmd)

    args = sys.argv
    cmd = ["poetry", "run", "python", "cli/cli.py"] + args[1:]
    subprocess.call(cmd)


if __name__ == "__main__":
    main()
