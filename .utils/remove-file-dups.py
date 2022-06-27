import os
import re
from glob import glob

def removeDuplicates(directory):
    # iterate through directory and remove duplicates
    for file in os.scandir(directory):
        if file.is_file():
            match = re.match('(?P<date>\d{4}-\d{2}-\d{2})-\d+?\.', file.name)
            if match:
                date_string = match.group('date')
                matching_files = glob(directory+'/'+date_string+'*')
                if len(matching_files) > 2:
                    print('special handling needed for '+file.name)
                elif len(matching_files) == 2:
                # if len(matching_files) == 2:
                    other_file = matching_files[1] if matching_files[0] == file.path else matching_files[0]
                    other_match = re.search('\d{4}-\d{2}-\d{2}-\D+?\.', other_file)
                    if other_match:
                        print('removing '+file.name+' from',matching_files,sep=':')
                        os.remove(file)

def main():
    removeDuplicates('_posts')

main()
