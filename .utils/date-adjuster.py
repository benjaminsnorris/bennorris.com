from datetime import datetime, timedelta
import os
import re
import pytz

def adjustFiles(directory):
    for file in os.scandir(directory):
        if file.is_file():
            adjustFile(file)

def adjustFile(file):
    if file.path.__contains__('.DS_Store'):
        return

    date_regex = re.compile('(?P<year_month>\d{4}-\d{2}-)(?P<day>\d{2})\s(?P<hour>\d{2})(?P<minute_second>:\d{2}:\d{2})-0000')
    file_read = open(file, 'r', encoding='utf-8')
    file_name = file_read.name
    contents = file_read.read()
    search = date_regex.search(contents)
    file_read.close()

    # If the post date is not GMT, no need to continue
    if not search:
        return

    gmt_date = datetime.strptime(search.group(0), '%Y-%m-%d %H:%M:%S%z')
    mtn = pytz.timezone('US/Mountain')
    adjusted_date = gmt_date.astimezone(mtn)
    new_date_string = adjusted_date.strftime('%Y-%m-%d %H:%M:%S%z')
    adjusted_contents = contents.replace(search.group(0), new_date_string)

    file_write = open(file, 'w')
    file_write.write(adjusted_contents)
    file_write.close()

    # If the GMT post date is not in the same day in mountain time, rename the file
    if gmt_date.day != adjusted_date.day:
        new_filename_date_string = adjusted_date.strftime('%Y-%m-%d')
        new_filename = re.sub('\d{4}-\d{2}-\d{2}', new_filename_date_string, file_name)
        os.rename(file_name, new_filename)
        print('renamed '+file_name+' to '+new_filename)
    else:
        print('updated date in '+file_name)

def main():
    directory = "_posts"
    adjustFiles(directory)
    # adjustFile('_posts/2020-05-05-star-wars-day.md')
    # adjustFile('_posts/2021-08-11-linkedin-live-sketchnote.md')

main()
