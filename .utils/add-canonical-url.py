import os
import re

def adjustFiles(directory, category, new_directory):
    for file in os.scandir(directory):
        if file.is_file():
            adjustFile(file, category, new_directory)

def adjustFile(file, category, new_directory):
    if file.path.__contains__('.DS_Store'):
        return

    category_regex = re.compile('category\:\s+?' + category)
    file_read = open(file, 'r', encoding='utf-8')

    match = re.match('(\d{4})-(\d{2})-(\d{2})-([^\.]+?)\.', file.name)
    if not match:
        print('No match for ' + file.name)
        return

    year = match.group(1)
    month = match.group(2)
    day = match.group(3)
    name = match.group(4)

    contents = file_read.read()
    category_search = category_regex.search(contents)
    file_read.close()

    if not category_search:
        # delete file
        # print('category not found in ' + file.name)
        return

    # If the post already contains a canonical url, no need to continue
    if contents.__contains__('canonical_url'):
        return

    canonical = 'canonical_url: https://bennorris.com/' + year + '/' + month + '/' + day + '/' + name + '\n'
    # print('file: ' + file.name + '\tupdated with ' + canonical)
    adjusted_contents = re.sub('date:',canonical + 'date:',contents)

    file_path = os.path.join(new_directory, file.name)
    file_write = open(file_path, 'w')
    file_write.write(adjusted_contents)
    file_write.close()

    print('added canonical url in ' + file_path)

def main():
    directory = "_posts"
    category = "Sketchnotable"
    new_directory = "export"
    os.makedirs(new_directory, exist_ok=True)
    adjustFiles(directory, category, new_directory)

main()
