from typing import Text
from moviepy.editor import *
import os
import re 
import xml.etree.ElementTree as ET
import collections
import datetime as dt
import math
import html
import urllib
from bs4 import BeautifulSoup

from requests.models import requote_uri
import upload_video
import requests

credits_duration = 2
#duration of silence after each audio clip
post_audio_duration = 2

server_URL = ""
server2_URL = ""
folder_name = "id0101a1/mobile/"

def get_title(element):
    for x in element:
        if x.tag == "Title":
            return x.text
    return None

def get_code(element):
    for x in element:
        if x.tag == "ModuleID":
            return x.text
    return None

def flatten(x):
    if len(x) > 0:
        return [a for i in x for a in flatten(i)]
    else:
        return [x]

def cleanhtml(raw_html):
  cleanr = re.compile('<.*?>|&([a-z0-9]+|#[0-9]{1,6}|#x[0-9a-f]{1,6});')
  cleantext = re.sub(cleanr, '', raw_html)
  return cleantext

def get_link_no_html(link_to_encode):
    encoded_link = urllib.parse.quote(link_to_encode)
    r = requests.get(f"{server_URL}/Android/strip_tags.php?u={encoded_link}&submit=submit", verify=False)
    return r

def get_tutorial_text(tut_id):
    r = get_link_no_html( server2_URL + "/he2_content2.asp?m=" + tut_id)
    if(r.status_code == 200):
        soup = BeautifulSoup(r.text)
        return str(soup.get_text().encode('utf-8').decode())
    else:
        return None

def get_tutoral_overview(tut_id, lang):
    r = get_link_no_html(f"{server2_URL}/HE2m_Overview.asp?m={tut_id}&l={lang}")
    if(r.status_code == 200):
        soup = BeautifulSoup(r.text)
        return str(soup.get_text().encode('utf-8'))
    else:
        return None

def get_tutorial_keywords(tut_id):
    r = get_link_no_html(f"{server2_URL}/client/ws_synonym.asp?m={tut_id}")
    if(r.status_code == 200):
        soup = BeautifulSoup(r.text)
        return str(soup.get_text().encode('utf-8'))
    else:
        return None

def slide_file_name(element):
    filename = folder_name + "slides/m_"
    filename += element.attrib['f']
    if('s' in element.attrib):
        filename += "_S"
    if('a' in element.attrib and not ('s' in element.attrib)):
        filename += ".gif"
    else:
        filename += ".png"
    return filename

def audio_file_name(element):
    filename = folder_name + "sound/m_s" + element.attrib['f']
    filename += ".mp3"
    return filename

timestamp_list = []
running_duration_counter = 0.0

def process_for_timestamp(element):
    if('s' in element.attrib):
        m, s = divmod(running_duration_counter, 60)
        h, m = divmod(m, 60)
        if(h == 0 and m == 0 and s ==0):
            pass
        else:
            s+=1

        stamp = ""
        if(h > 0):
            stamp += f'{h}:'
        stamp += f'{int(m):02d}:{int(s):02d}'
        stamp += " - " + element.attrib['s'] + " - "
        timestamp_list.append(stamp)
        
def write_timestamps():
    stamps = '\n\n' + '\n'.join(timestamp_list)
    output_file = open("output.txt", "w")
    soup = BeautifulSoup(stamps)
    output_file.write(str(soup.get_text().encode('utf-8')))
    output_file.close()
    return str(soup.get_text().encode('utf-8').decode())

tree = ET.parse(folder_name +  "A2.xml")
root = tree.getroot()

infonode = root[0]

nodelist = root[1:-1]
nodelist_flat = flatten(nodelist)

for item in nodelist_flat:
    print(item.attrib['f'])

videoclips = []
for node in nodelist_flat:
    process_for_timestamp(node)
    print(audio_file_name(node))
    audio = AudioFileClip(audio_file_name(node))
    slide_duration = audio.duration + post_audio_duration
    running_duration_counter += slide_duration
    newclip = ImageClip(slide_file_name(node), duration=slide_duration)
    newclip = newclip.set_audio(audio)
    videoclips.append(newclip)

title = get_title(infonode)
code = get_code(infonode)

desc_file = open("desc.txt", "w", encoding='utf-8')
desc_file.write( "\n\n" + get_tutoral_overview(code,1).replace("\r", "") + "\n" + write_timestamps() )
desc_file.close()

filename = code + ".mp4"
args = {
    "file": filename,
    "title":get_title(infonode),
    "description": "\n\n" + get_tutoral_overview(code, 1).replace("\r", "") + "\n\n" + write_timestamps(),
    "category": "27",
    "keywords": get_tutorial_keywords(code),
    "privacyStatus": "unlisted",
    "logging_level":'DEBUG',
    "noauth_local_webserver":"true"

}

class CreateVideo(object):
  def __init__(self, adict):
    self.__dict__.update(adict)

final_clip = concatenate_videoclips(videoclips)
final_clip.write_videofile(get_code(infonode) + ".mp4", fps=24)

upload_video.do_upload(CreateVideo(args))
