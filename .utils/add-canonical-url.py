import os
import re

def adjustFiles(directory, category):
    for file in os.scandir(directory):
        if file.is_file():
            adjustFile(file, category)

def adjustFile(file, category):
    if file.path.__contains__('.DS_Store'):
        return


    category_regex = re.compile('category\:\s+?' + category)
    file_read = open(file, 'r', encoding='utf-8')
    file_name = file_read.name

    match = re.match('(\d{4})-(\d{2})-(\d{2})-(.+?)', file_name)
    if not match:
        return

    year = match.group(0)
    month = match.group(1)
    day = match.group(2)
    name = match.group(3)

    contents = file_read.read()
    category_search = category_regex.search(contents)
    file_read.close()

    if not category_search:
        # delete file
        return

    # If the post already contains a canonical url, no need to continue
    if contents.__contains__('canonical_url'):
        return

    canonical = 'https://bennorris.com/' + year + '/' + month + '/' + day + '/' + name + '\n'
    print(canonical)
    # adjusted_contents = re.sub('date:',canonical + 'date:',contents)

    # file_write = open(file, 'w')
    # file_write.write(adjusted_contents)
    # file_write.close()

    # print('added canonical url in '+file_name)

def main():
    directory = "_posts"
    category = "Sketchnotable"
    # adjustFiles(directory, category)
    # adjustFile('_posts/2019-04-07-general-conference-3-cook-sketchnote.md')
    adjustFile('_posts/2021-08-11-linkedin-live-sketchnote.md')

main()
