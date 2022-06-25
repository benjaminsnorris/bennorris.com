import os
import re
from datetime import datetime

def createPosts(directory):
    for file in os.scandir(directory):
        if file.is_file():
            match = re.match('(?P<date>\d{4}-\d{2}-\d{2})-(?P<hour>\d{2})(?P<minute>\d{2})', file.name)
            if match:
                date_string = match.group(0)
                date = datetime.strptime(date_string, '%Y-%m-%d-%H%m')
                print(date)

def main():
    createPosts('mindfulsketch')

main()
