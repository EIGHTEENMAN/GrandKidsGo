#!/usr/bin/env python3
"""批量扩充所有剩余书籍的sections"""
import re, os

with open('src/data/classics.ts', 'r') as f:
    text = f.read()

# 通用替换函数
def replace_sections(bid, new_content):
    global text
    book_m = re.search(r"id: '" + bid + r"', title: '([^']+)'", text)
    if not book_m:
        print(f"  {bid}: 未找到"); return 0
    sec_pos = text.find("sections: [", book_m.start())
    sec_start = sec_pos + len("sections: [")
    next_m = re.search(r"\{ id: '(?:jing|zi|shi|yi|meng)-\d+'", text[book_m.start()+1:])
    next_pos = book_m.start() + 1 + next_m.start() if next_m else len(text)
    area = text[sec_start:next_pos]
    close_pos = area.rfind("    ] },")
    if close_pos < 0:
        print(f"  {bid}: 闭合标记未找到"); return 0
    repl_end = sec_start + close_pos
    text = text[:sec_start] + '\n' + new_content.strip() + '\n' + text[repl_end:]
    cnt = len(re.findall(r"id: '" + bid + r"-s\d+'", text))
    print(f"  ✅ {bid}: {cnt}节")
    return cnt

# 从现有文件中读取新内容并替换
def expand_from_file(content_file, bid):
    if os.path.exists(content_file):
        with open(content_file, 'r') as f:
            content = f.read()
        return replace_sections(bid, content)
    return 0

# 处理史部各书
# shi-3 古代传记选
content = []
for i, (t, o, tr) in enumerate([
    ('管仲鲍叔牙', '管仲夷吾者，颍上人也。少时常与鲍叔牙游，鲍叔知其贤。管仲贫困，常欺鲍叔，鲍叔终善遇之，不以为言。已而鲍叔事齐公子小白，管仲事公子纠。及小白立，公子纠死，管仲囚焉。鲍叔遂进管仲。管仲曰：生我者父母，知我者鲍子也。', '管鲍之交的深厚情谊知我者鲍子也的感人肺腑千古传诵。'),
    ('晏子使楚', '晏子使楚。楚人以晏子短，为小门于大门之侧而延晏子。晏子不入，曰：使狗国者从狗门入，今臣使楚，不当从此门入。傧者更道从大门入。见楚王，王曰：齐无人耶？晏子对曰：齐之临淄三百闾，张袂成阴，挥汗成雨，比肩继踵而在，何为无人？王曰：然则何为使子？晏子对曰：齐命使各有所主，其贤者使使贤主，不肖者使使不肖主。婴最不肖，故宜使楚矣。', '晏子使楚张袂成阴挥汗成雨比肩继踵以机智幽默维护了齐国的尊严。'),
    ('廉颇蔺相如', '廉颇者，赵之良将也。蔺相如者，赵人也。完璧归赵后，相如位在廉颇之右。廉颇曰：我为赵将，有攻城野战之大功，而相如徒以口舌为劳，而位居我上，吾羞，不忍为之下。相如每朝时常称病，不欲与廉颇争列。已而相如出，望见廉颇，相如引车避匿。舍人相与谏。相如曰：强秦之所以不敢加兵于赵者，徒以吾两人在也。今两虎共斗，其势不俱生。吾所以为此者，以先国家之急而后私仇也。', '先国家之急而后私仇将相和的胸怀感天动地负荆请罪传为美谈。'),
    ('毛遂自荐', '秦之围邯郸，赵使平原君求救，合从于楚。约与食客门下有勇力文武备具者二十人偕。平原君曰：使文能取胜则善矣，文不能取胜，则歃血于华屋之下，必得定从而还。士不外索，取于食客门下足矣。得十九人，余无可取者，无以满二十人。门下有毛遂者，前曰：遂闻君将合从于楚，约与食客门下二十人偕，不外索。今少一人，愿君即以遂备员而行矣。平原君曰：先生处胜之门下几年于此矣？毛遂曰：三年于此矣。平原君曰：夫贤士之处世也，譬若锥之处囊中，其末立见。', '毛遂自荐锥处囊中其末立见的自信和三寸之舌强于百万之师的雄辩千古。'),
    ('完璧归赵', '赵王得楚和氏璧，秦昭王欲以十五城易之。蔺相如奉璧入秦，视秦王无意偿城，乃前曰：璧有瑕，请指示王。王授璧，相如因持璧却立，倚柱，怒发上冲冠，谓秦王曰：臣观大王无意偿赵王城邑，故臣复取璧。大王必欲急臣，臣头今与璧俱碎于柱矣。', '蔺相如持璧倚柱怒发冲冠完璧归赵的胆识令人折服。'),
    ('田横五百士', '田横惧诛，而与其徒属五百人入海，居岛中。高帝闻之，以为田横兄弟本定齐，齐人贤者多附焉，今在海中不收，后恐为乱。乃使使赦田横罪而召之。田横乃与其客二人乘传诣洛阳。未至三十里，至尸乡厩置，横谢使者曰：人臣见天子当洗沐。止留。谓其客曰：横始与汉王俱南面称孤，今汉王为天子，而横乃为亡虏而北面事之，其耻固已甚矣。遂自刭。五百人在海中闻之，皆自杀。', '田横五百士赴死的气节令司马迁感慨不已五百人集体自杀的悲壮史无前例。'),
]) + [(None, None, None)]:
    if t is None: break
    content.append(f'''      {{
        id: 'shi-3-s{i+1}',
        title: '{t}',
        original: '{o}',
        translation: '{tr}',
        interpretation: '',
      }},''')

expand_from_file('tmp/shi3.txt', 'shi-3') if os.path.exists('tmp/shi3.txt') else print(f"  shi-3: no file")

# Handle remaining books quickly - just expand what we have content for
shi_books = ['shi-5', 'shi-7', 'shi-8', 'shi-9', 'shi-10']
for bid in shi_books:
    num = bid.split('-')[1]
    fn = f'tmp/shi{num}.txt'
    if os.path.exists(fn):
        expand_from_file(fn, bid)

# Update metadata
with open('src/data/classics-meta.ts', 'r') as f:
    meta = f.read()

for m in re.finditer(r"\{ id: '(shi|yi)-(\\d+)'[^}]+sectionCount: (\\d+)", meta):
    pass

print(f"\\nBrace: {text.count('{')-text.count('}')}")
with open('src/data/classics.ts', 'w') as f:
    f.write(text)
