// 구약·신약 사건 상호참조(예표론적 연결) 데이터.
// bible_map_v22.html 원본에서 그대로 옮김 — 재작성 없음.

const OT_NT_LINKS = {
  // NT id → 연결된 OT 항목들
  jerusalem:       { otIds:['jerusalem_david','jerusalem_hezekiah','jerusalem_return'], label:'구약 예루살렘', note:'다윗 왕국 수도 → 히스기야 성벽·터널 → 느헤미야 성벽 재건' },
  bethlehem:       { otIds:['bethlehem_ruth'], label:'구약 베들레헴', note:'룻·보아스 만남 — 다윗 탄생지 (삼상 17:12)' },
  jericho:         { otIds:['jericho_exodus'], label:'구약 여리고', note:'여호수아 정복 첫 성읍 — 라합의 붉은 줄 (수 2장)' },
  jordan_baptism:  { otIds:['jordan_river'], label:'구약 요단 강', note:'여호수아 도강 — 법궤 앞에 물이 끊어짐 (수 3장)' },
  sychar:          { otIds:['shechem_patriarch','shechem_joshua'], label:'구약 세겜', note:'아브라함·야곱 제단 — 요셉 묘지 — 여호수아 고별 언약 (수 24장)' },
  samaria_city:    { otIds:['samaria_omri'], label:'구약 사마리아', note:'오므리 건설 북왕국 수도 — 아합·이세벨 바알 숭배 (왕상 16장)' },
  nain:            { otIds:['endor'], label:'구약 엔돌 인근', note:'사울의 신접 여인 — 사무엘 영 소환 (삼상 28장)' },
  gethsemane:      { otIds:['araunah','temple_solomon'], label:'구약 모리아 산', note:'아라우나 타작마당·솔로몬 성전 터 — 이삭 번제 언약 (창 22장)' },
  olivet:          { otIds:['temple_solomon','araunah'], label:'구약 성전 터 동편', note:'솔로몬 성전 동쪽 산 — 다윗이 압살롬 피해 올라감 (삼하 15:30)' },
  golgotha:        { otIds:['moriah','araunah'], label:'구약 모리아 산 근방', note:'이삭 번제 (창 22장) — 아라우나 타작마당·성전 터 인근' },
  bethesda:        { otIds:['temple_solomon'], label:'구약 성전 북측', note:'솔로몬 성전 북편 — 성전 봉헌 (왕상 8장)' },
  siloam:          { otIds:['jerusalem_david','jerusalem_hezekiah'], label:'구약 기혼 샘·히스기야 터널', note:'히스기야 터널 종점 (왕하 20:20) — 다윗 성 동쪽 수원' },
  antonia:         { otIds:['temple_solomon','araunah'], label:'구약 성전 터 북편', note:'솔로몬 성전 터 북측 — 성전 봉헌 (왕상 8장)' },
  upper_room:      { otIds:['jerusalem_david'], label:'구약 다윗 성', note:'다윗 왕국 수도 — 시온 산 다윗 성읍' },
  garden_tomb:     { otIds:['jerusalem_david'], label:'구약 예루살렘 성 근방', note:'다윗 왕국 예루살렘 성 북편 (삼하 5:6-9)' },
};

// OT id → 연결된 NT 항목들 (역방향 자동 생성)

const NT_OT_LINKS = {};
Object.entries(OT_NT_LINKS).forEach(([ntId, data])=>{
  data.otIds.forEach(otId=>{
    if(!NT_OT_LINKS[otId]) NT_OT_LINKS[otId] = [];
    NT_OT_LINKS[otId].push({ ntId, note: data.note });
  });
});

// ═══════════════════════════════════
// 사건 단위 구약↔신약 연결 (예표·성취 / 예언·성취)
// 위 OT_NT_LINKS가 "같은/인접한 지명"을 연결한다면, 이것은 서로 다른 지명이라도
// 신학적으로 연결된 "특정 사건"을 짝지어 준다 (예: 광야의 놋뱀 ↔ 십자가).
// refMatch는 해당 지명의 events[].ref 문자열에 포함된 고유 부분 문자열로 사건을 특정한다.
// ═══════════════════════════════════

const EVENT_XREFS = [
  { a:{placeId:'moriah',        refMatch:'창 22:1'},  b:{placeId:'golgotha',    refMatch:'마 27:33'},
    type:'예표·성취', label:'이삭의 결박 → 그리스도의 십자가',
    note:'아버지가 사랑하는 독자를 번제로 바치려 한 순종의 사건은, 하나님이 자신의 독생자를 십자가에 내어주신 사건의 예표다. 두 사건 모두 같은 모리아 산 지역에서 일어난다(대하 3:1).' },
  { a:{placeId:'is_moriah',     refMatch:'창 22:1'},  b:{placeId:'golgotha',    refMatch:'마 27:33'},
    type:'예표·성취', label:'이삭의 결박 → 그리스도의 십자가',
    note:'아버지가 사랑하는 독자를 번제로 바치려 한 순종의 사건은, 하나님이 자신의 독생자를 십자가에 내어주신 사건의 예표다. 두 사건 모두 같은 모리아 산 지역에서 일어난다(대하 3:1).' },
  { a:{placeId:'edom_seir',     refMatch:'민 20:14'}, b:{placeId:'golgotha',    refMatch:'마 27:33'},
    type:'예표·성취', label:'광야의 놋뱀 → 십자가에 달리신 그리스도',
    note:'장대에 매단 놋뱀을 쳐다본 자마다 살았듯, 예수님도 들려 죽으심으로 그를 바라보는 모든 자에게 영생을 주신다(요 3:14-15).' },
  { a:{placeId:'mara_elim',     refMatch:'출 15:22'}, b:{placeId:'capernaum',   refMatch:'요 6:22'},
    type:'예표·성취', label:'광야의 만나 → 생명의 떡',
    note:'하늘에서 내린 만나가 하루하루 육신의 필요를 채웠다면, 예수님은 영원한 생명을 주는 참된 하늘 양식이심을 선언하신다(요 6:32-35).' },
  { a:{placeId:'jerusalem_david', refMatch:'삼하 5-7'}, b:{placeId:'nazareth',  refMatch:'눅 1:26'},
    type:'예언·성취', label:'다윗 언약(영원한 왕위) → 예수 그리스도의 나심',
    note:'나단을 통해 다윗에게 주신 "네 왕위가 영원히 견고하리라"는 언약은, 가브리엘이 마리아에게 "주 하나님께서 그 조상 다윗의 위를 그에게 주시리니"라 전한 예수님의 나심으로 성취된다(눅 1:32-33).' },
  { a:{placeId:'nineveh',       refMatch:'요나서'},   b:{placeId:'garden_tomb', refMatch:'마 28:1'},
    type:'예표·성취', label:'요나의 표적(물고기 3일) → 그리스도의 부활',
    note:'요나가 물고기 뱃속에 사흘을 있었던 것처럼 인자도 땅속에 사흘을 있으리라 하신 말씀대로(마 12:40), 예수님은 사흘 만에 부활하셨다.' },
  { a:{placeId:'rephidim',      refMatch:'출 17장'},  b:{placeId:'sychar',      refMatch:'요 4:1-26'},
    type:'예표·성취', label:'반석에서 나온 물 → 생수를 주시는 그리스도',
    note:'모세가 친 반석에서 물이 솟아나 백성의 목마름을 해결했듯, 예수님은 자신이 주는 물을 마시면 영원히 목마르지 않는 생수의 근원이심을 사마리아 여인에게 선언하신다(고전 10:4 "그 반석은 곧 그리스도시라").' },
  { a:{placeId:'eden',          refMatch:'창 3:20'},  b:{placeId:'golgotha',    refMatch:'마 27:33'},
    type:'예표·성취', label:'가죽옷(첫 희생 제사) → 그리스도의 십자가',
    note:'죄를 지은 아담과 하와에게 하나님이 짐승의 가죽으로 옷을 지어 입히신 것은 최초의 희생 제사였다. 이는 죄인을 덮기 위해 자신의 생명을 내어주신 그리스도의 십자가로 성취된다.' },
  { a:{placeId:'sinai',         refMatch:'출 32-34'}, b:{placeId:'gethsemane',  refMatch:'마 26:36'},
    type:'예표·성취', label:'모세의 중보 기도 → 그리스도의 겟세마네 기도',
    note:'금송아지로 진노하신 하나님 앞에서 모세가 "주의 백성을 생각하소서"라며 자신을 걸고 중보했듯, 예수님은 겟세마네에서 자기 뜻보다 아버지의 뜻을 구하며 죄인을 위해 자신을 내어놓으신다.' },

  // ── 구약 본문을 신약이 직접 인용한 사건들 ──
  { a:{placeId:'rachel_1',        refMatch:'렘 31:15'},  b:{placeId:'bethlehem',        refMatch:'마 2:1-18'},
    type:'예언·인용', label:'라헬의 애곡 예언 → 베들레헴 영아 학살',
    note:'"라마에서 슬퍼하며 크게 통곡하는 소리가 들리니 라헬이 그 자식을 위하여 애곡함이라"(렘 31:15)는 예언은, 헤롯이 베들레헴의 두 살 이하 사내아이들을 학살한 사건에서 마태복음이 직접 인용하며 성취된 것으로 기록한다(마 2:17-18).' },
  { a:{placeId:'anathoth',        refMatch:'렘 32:6-15'}, b:{placeId:'jerusalem',        refMatch:'마 26:17-56'},
    type:'예언·성취', label:'예레미야의 새 언약 예언 → 최후 만찬의 성찬 제정',
    note:'예루살렘 포위 중에도 밭을 사며 회복을 확신했던 예레미야는 "내가 이스라엘 집과 새 언약을 맺으리라"(렘 31:31-34)고 예언했다. 이 새 언약은 최후의 만찬에서 예수님이 "이것은 새 언약의 피"라 하신 말씀으로 성취된다(눅 22:20).' },
  { a:{placeId:'iy_siloam_pool',  refMatch:'사 7장'},     b:{placeId:'bethlehem',        refMatch:'눅 2:1-20'},
    type:'예언·성취', label:'임마누엘 예언(동정녀 탄생) → 예수 탄생',
    note:'"보라 처녀가 잉태하여 아들을 낳을 것이요 그 이름을 임마누엘이라 하리라"(사 7:14)는 이사야의 예언은 마태복음이 예수님의 나심을 설명하며 직접 인용한다(마 1:22-23).' },
  { a:{placeId:'micah_prophet_1', refMatch:'미 1-7장'},   b:{placeId:'bethlehem',        refMatch:'마 2:1-18'},
    type:'예언·성취', label:'베들레헴 메시아 탄생지 예언 → 동방박사의 경배',
    note:'"베들레헴 에브라다야 ... 이스라엘을 다스릴 자가 네게서 내게로 나올 것이라"(미 5:2)는 미가의 예언을, 헤롯 앞의 대제사장과 서기관들이 그대로 인용해 메시아의 탄생지를 알려준다(마 2:5-6).' },
  { a:{placeId:'hosea_prophet_1', refMatch:'호 1-3장'},   b:{placeId:'j_egypt_flight',   refMatch:'마 2:13-23'},
    type:'예언·인용', label:'"애굽에서 내 아들을 불렀다" → 아기 예수의 애굽 피신·귀환',
    note:'출애굽 때 이스라엘을 향해 하신 "애굽에서 내 아들을 불렀다"(호 11:1)는 말씀을, 마태복음은 헤롯을 피해 애굽으로 피신했다가 돌아온 아기 예수에게 다시 적용해 인용한다(마 2:15).' },
  { a:{placeId:'zechariah_prophet_1', refMatch:'슥 1-14장'}, b:{placeId:'jerusalem',    refMatch:'마 21-25장'},
    type:'예언·성취', label:'겸손한 왕이 나귀를 타고 오시리라 → 종려주일 예루살렘 입성',
    note:'"보라 네 왕이 네게 임하시나니 그는 공의로우시며 구원을 베풀며 겸손하여 나귀를 타시나니"(슥 9:9)라는 스가랴의 예언은, 예수님이 나귀 새끼를 타고 예루살렘에 입성하신 종려주일 사건에서 성취된다(마 21:4-5).' },
  { a:{placeId:'m_deuteronomy',   refMatch:'신 1-30장'},     b:{placeId:'jordan_baptism',  refMatch:'마 4:1-11'},
    type:'예언·인용', label:'신명기 말씀 → 광야에서 사탄을 물리치신 예수',
    note:'모압 평지에서 모세가 선포한 신명기 말씀(신 6:13,16; 8:3)을, 예수님은 광야의 세 가지 시험 때마다 "기록되었으되"라며 그대로 인용해 사탄을 물리치신다(마 4:4,7,10).' },
  { a:{placeId:'joel_prophet_1',  refMatch:'욜 1-3장'},      b:{placeId:'upper_room',      refMatch:'행 1:13-2:47'},
    type:'예언·성취', label:'요엘의 성령 부어주심 예언 → 오순절 성령 강림',
    note:'"내가 내 영을 만민에게 부어 주리니 너희 자녀들은 장래 일을 말할 것이며"(욜 2:28-32)라는 요엘의 예언을, 베드로는 오순절 성령 강림 현장에서 직접 인용하며 그 성취를 선포한다(행 2:16-21).' },
  { a:{placeId:'zechariah_prophet_1', refMatch:'슥 1-14장'}, b:{placeId:'judas_iscariot_4', refMatch:'마 27:3-10'},
    type:'예언·성취', label:'은 삼십에 팔리신 목자 예언 → 유다의 배반 값과 토기장이의 밭',
    note:'스가랴가 예언한 "은 삼십 개"의 목자 몸값과 그 돈이 토기장이에게 던져지는 장면(슥 11:12-13)은, 유다가 예수를 판 은 삼십을 성전에 던지고 그 돈으로 토기장이의 밭을 산 사건에서 문자 그대로 성취된다(마 27:9-10).' },

  // ── 인물 자신의 여정에서도 동일하게 확인 가능하도록 추가한 대체 연결 ──
  { a:{placeId:'aaron_rephidim',   refMatch:'출 17장'},   b:{placeId:'sychar',      refMatch:'요 4:1-26'},
    type:'예표·성취', label:'반석에서 나온 물 → 생수를 주시는 그리스도',
    note:'모세가 친 반석에서 물이 솟아나 백성의 목마름을 해결했듯, 예수님은 자신이 주는 물을 마시면 영원히 목마르지 않는 생수의 근원이심을 사마리아 여인에게 선언하신다(고전 10:4 "그 반석은 곧 그리스도시라").' },
  { a:{placeId:'sinai',            refMatch:'출 32-34'},  b:{placeId:'john_apostle_gethsemane', refMatch:'마 26:36'},
    type:'예표·성취', label:'모세의 중보 기도 → 그리스도의 겟세마네 기도',
    note:'금송아지로 진노하신 하나님 앞에서 모세가 "주의 백성을 생각하소서"라며 자신을 걸고 중보했듯, 예수님은 겟세마네에서 자기 뜻보다 아버지의 뜻을 구하며 죄인을 위해 자신을 내어놓으신다.' },
  { a:{placeId:'moriah',           refMatch:'창 22:1'},   b:{placeId:'john_apostle_golgotha', refMatch:'마 27:33'},
    type:'예표·성취', label:'이삭의 결박 → 그리스도의 십자가',
    note:'아버지가 사랑하는 독자를 번제로 바치려 한 순종의 사건은, 하나님이 자신의 독생자를 십자가에 내어주신 사건의 예표다. 두 사건 모두 같은 모리아 산 지역에서 일어난다(대하 3:1).' },
  { a:{placeId:'edom_seir',        refMatch:'민 20:14'},  b:{placeId:'john_apostle_golgotha', refMatch:'마 27:33'},
    type:'예표·성취', label:'광야의 놋뱀 → 십자가에 달리신 그리스도',
    note:'장대에 매단 놋뱀을 쳐다본 자마다 살았듯, 예수님도 들려 죽으심으로 그를 바라보는 모든 자에게 영생을 주신다(요 3:14-15).' },
  { a:{placeId:'eden',             refMatch:'창 3:20'},   b:{placeId:'john_apostle_golgotha', refMatch:'마 27:33'},
    type:'예표·성취', label:'가죽옷(첫 희생 제사) → 그리스도의 십자가',
    note:'죄를 지은 아담과 하와에게 하나님이 짐승의 가죽으로 옷을 지어 입히신 것은 최초의 희생 제사였다. 이는 죄인을 덮기 위해 자신의 생명을 내어주신 그리스도의 십자가로 성취된다.' },
  { a:{placeId:'jn_sea',           refMatch:'욘 1:11-2:10'}, b:{placeId:'garden_tomb', refMatch:'마 28:1'},
    type:'예표·성취', label:'요나의 표적(물고기 3일) → 그리스도의 부활',
    note:'요나가 물고기 뱃속에 사흘을 있었던 것처럼 인자도 땅속에 사흘을 있으리라 하신 말씀대로(마 12:40), 예수님은 사흘 만에 부활하셨다.' },
  { a:{placeId:'nineveh',          refMatch:'요나서'},     b:{placeId:'mary_magdalene_4', refMatch:'요 20:1-18'},
    type:'예표·성취', label:'요나의 표적(물고기 3일) → 그리스도의 부활',
    note:'요나가 물고기 뱃속에 사흘을 있었던 것처럼 인자도 땅속에 사흘을 있으리라 하신 말씀대로(마 12:40), 예수님은 사흘 만에 부활하셨다. 막달라 마리아가 빈 무덤에서 부활하신 예수님을 처음 만난다(요 20:1-18).' },
  { a:{placeId:'joel_prophet_1',   refMatch:'욜 1-3장'},   b:{placeId:'pe_jerusalem_pentecost', refMatch:'행 2장'},
    type:'예언·성취', label:'요엘의 성령 부어주심 예언 → 오순절 성령 강림',
    note:'"내가 내 영을 만민에게 부어 주리니 너희 자녀들은 장래 일을 말할 것이며"(욜 2:28-32)라는 요엘의 예언을, 베드로는 오순절 성령 강림 현장에서 직접 인용하며 그 성취를 선포한다(행 2:16-21).' },
  { a:{placeId:'iy_siloam_pool',   refMatch:'사 7장'},     b:{placeId:'joseph_earthly_1', refMatch:'마 1:18-25'},
    type:'예언·성취', label:'임마누엘 예언(동정녀 탄생) → 예수 탄생',
    note:'"보라 처녀가 잉태하여 아들을 낳을 것이요 그 이름을 임마누엘이라 하리라"(사 7:14)는 이사야의 예언은, 천사가 요셉에게 현몽하여 마리아를 아내로 맞으라 이르는 장면에서 마태복음이 직접 인용한다(마 1:22-23).' },
  { a:{placeId:'iy_babylon_hope',  refMatch:'사 44:28; 53장'}, b:{placeId:'gaza_road',   refMatch:'행 8:26-40'},
    type:'예언·성취', label:'고난받는 종 예언(이사야 53장) → 에디오피아 내시에게 전해진 그리스도',
    note:'"그가 찔림은 우리의 허물 때문이요 그가 상함은 우리의 죄악 때문이라"(사 53:5)는 이사야의 고난받는 종 예언을, 빌립은 가사로 가는 길에서 성경을 읽던 에디오피아 내시에게 그리스도로 풀어 설명하며 세례를 준다(행 8:32-35).' },
  { a:{placeId:'melchizedek_1',    refMatch:'창 14:18-20'}, b:{placeId:'melchizedek_hebrews7', refMatch:'히 7장'},
    type:'예표·해석', label:'멜기세덱의 축복 → 그리스도의 영원한 대제사장직 (히브리서의 논증)',
    note:'족보도 시작한 날도 끝난 날도 없이 홀연히 등장해 아브람을 축복한 왕이자 제사장 멜기세덱을, 히브리서는 레위 계통을 넘어서는 그리스도의 영원한 대제사장직의 예표로 정교하게 풀어낸다(히 7장). 이 연결은 특정 신약 "사건"이 아니라 서신서의 신학적 논증이므로, 지도상 위치는 상징적으로 표시된다.' },
  { a:{placeId:'eve_2',            refMatch:'창 4장'},      b:{placeId:'eve_hebrews11', refMatch:'히 11:4'},
    type:'예표·해석', label:'아벨의 믿음의 제사 → 믿음 장(히브리서 11장)의 첫 증인',
    note:'"믿음으로 아벨은 가인보다 더 나은 제사를 하나님께 드림으로 의로운 자라 하는 증거를 얻었으니... 그가 죽었으나 그 믿음으로써 지금도 말하느니라"(히 11:4) — 히브리서는 아벨의 제사를 참된 믿음이 무엇인지 보여주는 첫 사례로 제시한다.' },
  { a:{placeId:'iy_galilee_light', refMatch:'사 9:1-7'},    b:{placeId:'capernaum',    refMatch:'막 1:21-28'},
    type:'예언·성취', label:'갈릴리의 빛 예언 → 가버나움 정착·공생애 본격 시작',
    note:'"흑암에 행하던 백성이 큰 빛을 보고... 한 아기가 우리에게 났고 한 아들을 우리에게 주신 바 되었는데"(사 9:2,6)라는 이사야의 예언대로, 예수님은 멸시받던 변방 갈릴리 가버나움에 정착하여 공생애를 본격적으로 시작하신다(마 4:12-16).' },
  { a:{placeId:'iy_comfort_voice', refMatch:'사 40:1-11'},  b:{placeId:'jordan_baptism', refMatch:'마 3:1-12'},
    type:'예언·성취', label:'위로의 시작·광야의 소리 예언 → 세례 요한의 외침',
    note:'"외치는 자의 소리여 이르되 너희는 광야에서 여호와의 길을 예비하라"(사 40:3)는 예언대로, 세례 요한은 광야에서 "회개하라 천국이 가까이 왔느니라" 외치며 메시아의 길을 예비한다(마 3:1-3).' },
  { a:{placeId:'iy_jubilee',       refMatch:'사 61:1-2'},   b:{placeId:'nazareth',    refMatch:'눅 4:16-30'},
    type:'예언·성취', label:'메시아 사명 선언(희년) → 나사렛 회당에서의 낭독',
    note:'"주의 성령이 내게 임하셨으니... 주의 은혜의 해를 전파하게 하려 하심이라"(사 61:1-2)는 예언을, 예수님은 나사렛 회당에서 직접 낭독하신 후 "오늘 이 글이 너희 귀에 응하였느니라" 선언하신다(눅 4:18-21).' },
];

const XREF_BY_PLACE = {};
EVENT_XREFS.forEach(x => {
  [[x.a,x.b],[x.b,x.a]].forEach(([self,other]) => {
    if(!XREF_BY_PLACE[self.placeId]) XREF_BY_PLACE[self.placeId] = [];
    XREF_BY_PLACE[self.placeId].push({ refMatch:self.refMatch, otherPlaceId:other.placeId, type:x.type, label:x.label, note:x.note });
  });
});
function findEventXrefs(placeId, ref) {
  const list = XREF_BY_PLACE[placeId];
  if(!list) return [];
  const matched = list.filter(x => (ref||'').includes(x.refMatch));
  // 같은 개념적 연결이 서로 다른 인물여정 경로(예: 모리아산 지명 / 이삭 인물여정)를 통해
  // 중복 등록된 경우, 라벨 기준으로 한 번만 보여준다.
  const seen = {};
  return matched.filter(x => {
    if (seen[x.label]) return false;
    seen[x.label] = true;
    return true;
  });
}

const ALL_XREFS = (() => {
  const seen = {}; const list = [];
  EVENT_XREFS.forEach(x => {
    if (seen[x.label]) return;
    seen[x.label] = true;
    list.push(x);
  });
  return list;
})();

export { OT_NT_LINKS, NT_OT_LINKS, EVENT_XREFS, XREF_BY_PLACE, findEventXrefs, ALL_XREFS };
