#Do not run

from sys import *
import struct

keywords = ["START","SET","TO","END"]

variables = {
    "midi": {
        "program": ["Cn"],
        "control": ["Bn"],
        "noteon": ["9n"],
        "noteoff": ["8n"]
    },
    "meta": {
        "timesig": ["FF","58","04"],
        "keysig": ["FF","59","02"],
        "tempo": ["FF","51","03"],
        "name": ["FF","03","05"] #change this (last byte is the size)
    },
    "channel": 0
}

stream = [77,84,104,100,0,0,0,6,0,1]

tracks = []

def open_file(filename):
    data = open(filename, "r").read()
    data += "\n"
    return data

def write_file(filename, data):
    fd_out = open(filename,'wb') 

    for i in data:
        entry = struct.pack('<B', i)
        fd_out.write(entry)
        fd_out.flush()

    fd_out.close()

def split(stok):
    return stok.split(":")

def obj_split(stok):
    return stok.split('.')

def enter(bstr,arr):
    for x in bstr:
        arr.append(x)
    return arr

def hextodec(h):
    ret = []
    for x in h:
        x = x.replace("n",str(variables["channel"]))
        ret.append(int(x,16))
    return ret

def tolist(s):
    s = s.replace('(','').replace(')','')
    return s.split(',')

def toint(a):
    ret = []
    for x in a:
        ret.append(int(x))
    return ret

def lex(filecontents):
    tokens = []
    line = []
    tok = ""
    strs = 0
    string = ""
    expr = ""
    ls = ""
    lss = False
    start = 0
    filecontents = list(filecontents)
    
    for char in filecontents:
        tok += char
        if char == " ":
            if strs == 0 or not lss:
                if len(tok) > 0 and tok != " ":
                    line.append("VALUE:" + tok[:-1])
                tok = ""
            else:
                tok = " "
        elif char == "\n":
            if expr != "":
                line.append("NUM:" + expr)
                expr = ""
            tokens.append(line)
            line = []
            tok = ""
        elif tok in keywords:
            if tok == "START":
                start += 1
            line.append("KEYWORD:" + tok)
            tok = ""
        elif tok == "(":
            ls += tok
            lss = True
            tok = ""
        elif tok == ")":
            line.append("LIST:" + ls + ")")
            ls = ""
            lss = False
            tok = ""
        elif tok.isdigit() and strs == 0 and not lss:
            expr += tok
            tok = ""
        elif tok == "\"":
            if strs == 0:
                strs = 1
            elif strs == 1:
                line.append("STRING:" + string + "\"")
                string = ""
                strs = 0;
                tok = ""
        elif strs == 1:
            string += tok
            tok = ""
        elif lss:
            ls += tok
            tok = ""
    enter([0,start,1],stream)
    return tokens

def parse(toks):
    track = []
    
    for i in toks:
        j = 0
        while j < len(i):
            s = split(i[j])
            if s[0] == "KEYWORD":
                if s[1] == "START":
                    enter(enter(toint(tolist(split(i[j+1])[1])),[0,77,84,114,107]),track)
                    j += 2
                elif s[1] == "END":
                    enter([1,255,47],track)
                    j += 1
                elif s[1] == "SET":
                    if split(obj_split(i[j+1])[0])[1] == "channel":
                        variables["channel"] = split(i[j+3])[1]
                    else:
                        sv = split(i[j+1])[1]
                        mv = variables[obj_split(sv)[0]][obj_split(sv)[1]]
                        enter(enter(hextodec(mv),[0]),track)
                    j += 2
                elif s[1] == "TO":
                    if split(i[j+1])[0] == "LIST":
                        it = toint(tolist(split(i[j+1])[1]))
                        enter(it,track)
                    j += 2
                else:
                    j += 1
            else:
                j += 1
    enter(enter([0],track),stream)

def create_stream():
    print(stream)

def run():
    data = open_file(argv[1])
    toks = lex(data)
    parse(toks)
    write_file(argv[1].split(".")[0] + ".midi", stream)

run()













