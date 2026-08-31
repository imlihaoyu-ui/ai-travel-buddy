const TRIP_DATA = {
    title: "加拿大落基山脉 · 12天自驾之旅",
    dateRange: "9.25 - 10.6",
    travelers: "2人",
    mode: "自驾",
    preferences: ["自然风光", "摄影", "舒适优先"],
    days: [
        {
            day: 1,
            date: "9月25日",
            title: "抵达卡尔加里",
            route: "上海 → 马尼拉 → 温哥华 → 卡尔加里",
            driving: null,
            locations: [
                {
                    id: "calgary-airport",
                    name: "卡尔加里机场",
                    type: "transit",
                    coords: [51.1215, -114.0076],
                    icon: "✈️"
                }
            ],
            attractions: [],
            hotel: {
                id: "hotel-calgary",
                name: "Delta Hotels Calgary Airport In-Terminal",
                price: 890,
                currency: "CNY",
                rating: 4.3,
                reason: "航站楼内直达，22:55落地后无需再开车，直接步行入住休息",
                coords: [51.1215, -114.0076],
                tags: ["机场直达", "免接驳", "隔音好"],
                reviews: [
                    { author: "旅行者L", rating: "⭐⭐⭐⭐", text: "红眼航班到的，走几分钟就到酒店，床很舒服，隔音也不错" },
                    { author: "摄影老张", rating: "⭐⭐⭐⭐⭐", text: "自驾游第一晚最好的选择，省去找路的麻烦，第二天精力充沛出发" }
                ],
                alternatives: [
                    { name: "Acclaim Hotel Calgary Airport", price: 650, distance: "5分钟车程", reason: "性价比更高但需要坐接驳车" },
                    { name: "Best Western Premier Calgary Plaza", price: 720, distance: "10分钟车程", reason: "设施新，有泳池，适合调整时差" }
                ]
            }
        },
        {
            day: 2,
            date: "9月26日",
            title: "班夫国家公园 → Golden",
            route: "Calgary → Banff → Yoho → Golden",
            driving: "总行程约 3.5h",
            locations: [
                {
                    id: "loc-banff",
                    name: "班夫",
                    type: "city",
                    coords: [51.1784, -115.5708],
                    icon: "📍"
                },
                {
                    id: "loc-golden",
                    name: "Golden",
                    type: "city",
                    coords: [51.2965, -116.9689],
                    icon: "📍"
                }
            ],
            attractions: [
                {
                    id: "lake-minnewanka",
                    name: "Lake Minnewanka",
                    icon: "🏔️",
                    duration: "1h",
                    ticket: "免费（需国家公园通票）",
                    needReserve: false,
                    coords: [51.2333, -115.4833],
                    description: "班夫最大的湖泊，群山环绕，碧蓝如镜。早晨光线最佳，适合摄影。",
                    highlights: ["湖面倒影拍摄", "环湖步道前段", "野生动物观察"],
                    reviews: [
                        { author: "风光摄影师", rating: "⭐⭐⭐⭐⭐", text: "早上8点到，湖面如镜，拍到了完美倒影" },
                        { author: "自驾客", rating: "⭐⭐⭐⭐", text: "停车方便，步道平坦，半小时就能看到精华" }
                    ]
                },
                {
                    id: "two-jack-lake",
                    name: "Two Jack Lake",
                    icon: "🏔️",
                    duration: "30min",
                    ticket: "免费",
                    needReserve: false,
                    coords: [51.2417, -115.4667],
                    description: "小巧精致的湖泊，以Rundle山为背景，是经典明信片取景地。",
                    highlights: ["Rundle山倒影", "湖边野餐", "短途散步"],
                    reviews: [
                        { author: "背包客小王", rating: "⭐⭐⭐⭐⭐", text: "比Minnewanka人少，拍照更出片" }
                    ]
                },
                {
                    id: "banff-avenue",
                    name: "Banff Avenue 小镇",
                    icon: "🏘️",
                    duration: "1.5h",
                    ticket: "免费",
                    needReserve: false,
                    coords: [51.1784, -115.5708],
                    description: "班夫镇主街，两侧是餐厅、纪念品店和户外装备店，远处可见Cascade Mountain。",
                    highlights: ["午餐推荐", "户外装备采购", "小镇氛围感受"],
                    reviews: [
                        { author: "美食达人", rating: "⭐⭐⭐⭐", text: "The Bison餐厅的elk burger必吃" }
                    ]
                },
                {
                    id: "bow-falls",
                    name: "Bow Falls",
                    icon: "💧",
                    duration: "30min",
                    ticket: "免费",
                    needReserve: false,
                    coords: [51.1697, -115.5597],
                    description: "Bow River上的瀑布，水量充沛，是玛丽莲·梦露电影《大江东去》取景地。",
                    highlights: ["瀑布近距离观赏", "河边步道"],
                    reviews: [
                        { author: "历史爱好者", rating: "⭐⭐⭐⭐", text: "规模不大但很有气势，旁边步道可以走到Surprise Corner" }
                    ]
                },
                {
                    id: "vermilion-lakes",
                    name: "Vermilion Lakes",
                    icon: "🌅",
                    duration: "30min",
                    ticket: "免费",
                    needReserve: false,
                    coords: [51.1833, -115.6000],
                    description: "三个连续湖泊，以Rundle山为背景的日落圣地。即使不等日落，午后光线也很美。",
                    highlights: ["山景倒影", "短停拍照"],
                    reviews: [
                        { author: "摄影发烧友", rating: "⭐⭐⭐⭐⭐", text: "落基山最经典的日落拍摄点之一" }
                    ]
                },
                {
                    id: "natural-bridge",
                    name: "Natural Bridge",
                    icon: "🪨",
                    duration: "30min",
                    ticket: "免费",
                    needReserve: false,
                    coords: [51.3573, -116.5477],
                    description: "Kicking Horse River水流冲蚀岩石形成的天然石桥，水色碧绿，非常上镜。",
                    highlights: ["天然石桥", "碧绿河水", "地质奇观"],
                    reviews: [
                        { author: "地质爱好者", rating: "⭐⭐⭐⭐", text: "水的颜色太不真实了，翡翠绿" }
                    ]
                },
                {
                    id: "emerald-lake",
                    name: "Emerald Lake 翡翠湖",
                    icon: "💎",
                    duration: "1.5h",
                    ticket: "免费",
                    needReserve: false,
                    coords: [51.4433, -116.5317],
                    description: "Yoho国家公园的明珠，湖水呈惊艳的翡翠色，环湖步道5.2km，可只走前段。",
                    highlights: ["翡翠色湖水", "环湖步道前段", "湖边木屋拍照"],
                    reviews: [
                        { author: "旅行博主", rating: "⭐⭐⭐⭐⭐", text: "颜色比Lake Louise还惊艳，而且人少很多！" },
                        { author: "自驾客", rating: "⭐⭐⭐⭐⭐", text: "停车场不大，建议下午3点前到" }
                    ]
                }
            ],
            hotel: {
                id: "hotel-golden",
                name: "Basecamp Lodge Golden",
                price: 780,
                currency: "CNY",
                rating: 4.5,
                reason: "Golden镇评分最高的lodge，木屋风格，位置方便明早出发去Banff接驳点",
                coords: [51.2965, -116.9689],
                tags: ["木屋风格", "山景", "自助早餐", "停车免费"],
                reviews: [
                    { author: "自驾客小李", rating: "⭐⭐⭐⭐⭐", text: "房间很大，窗外就是雪山，早餐丰盛，位置好找" },
                    { author: "户外爱好者", rating: "⭐⭐⭐⭐", text: "很有加拿大mountain lodge的感觉，前台小哥推荐了好吃的餐厅" }
                ],
                alternatives: [
                    { name: "Prestige Inn Golden", price: 620, distance: "镇中心", reason: "价格更低，设施齐全，但风格偏商务" },
                    { name: "Kicking Horse Canyon B&B", price: 550, distance: "镇外10min", reason: "温馨民宿，主人是当地向导，可聊路线建议" }
                ]
            }
        },
        {
            day: 3,
            date: "9月27日",
            title: "Lake Louise + Moraine Lake",
            route: "Golden → Banff → Lake Louise → Moraine Lake → Golden",
            driving: "Golden↔Banff 约1.5h",
            locations: [
                {
                    id: "loc-louise",
                    name: "Lake Louise",
                    type: "scenic",
                    coords: [51.4167, -116.1667],
                    icon: "💎"
                }
            ],
            attractions: [
                {
                    id: "lake-louise",
                    name: "Lake Louise 露易丝湖",
                    icon: "💎",
                    duration: "2h",
                    ticket: "Roam Super Pass（已预订）",
                    needReserve: true,
                    reserveNote: "Roam Bus 约12:00从Banff出发",
                    coords: [51.4167, -116.1667],
                    description: "落基山脉皇冠上的宝石，Victoria冰川脚下的碧蓝湖泊，世界级风景。",
                    highlights: ["湖边主观景区", "Fairmont城堡酒店外观", "Lakeshore Trail前段"],
                    reviews: [
                        { author: "摄影师阿伦", rating: "⭐⭐⭐⭐⭐", text: "9月底湖水颜色最蓝，落叶松开始变黄，绝美" },
                        { author: "背包客", rating: "⭐⭐⭐⭐", text: "坐Roam巴士很方便，不用抢车位" }
                    ]
                },
                {
                    id: "moraine-lake",
                    name: "Moraine Lake 梦莲湖",
                    icon: "💎",
                    duration: "2h",
                    ticket: "Roam Super Pass（已预订）",
                    needReserve: true,
                    reserveNote: "通过Connector从Lake Louise前往",
                    coords: [51.3217, -116.1860],
                    description: "被十峰谷环绕的冰碛湖，曾印在加拿大20元纸币上。Rockpile Trail是最佳观景点。",
                    highlights: ["Rockpile Trail登顶俯瞰", "十峰谷全景", "湖边近距离"],
                    reviews: [
                        { author: "旅行达人", rating: "⭐⭐⭐⭐⭐", text: "比Lake Louise更震撼！一定要爬Rockpile，上面看下去就是明信片" },
                        { author: "自然爱好者", rating: "⭐⭐⭐⭐⭐", text: "9月底十峰谷可能有积雪，配合蓝湖水美得不真实" }
                    ]
                }
            ],
            hotel: {
                id: "hotel-golden-2",
                name: "Basecamp Lodge Golden",
                price: 780,
                currency: "CNY",
                rating: 4.5,
                reason: "连住两晚同一家，免去换酒店的麻烦，晚上从Banff回来直接休息",
                coords: [51.2965, -116.9689],
                tags: ["连住优惠", "免搬行李", "熟悉环境"],
                reviews: [
                    { author: "自驾客小李", rating: "⭐⭐⭐⭐⭐", text: "连住两晚很明智，第二天回来已经很晚了" }
                ],
                alternatives: []
            }
        },
        {
            day: 4,
            date: "9月28日",
            title: "冰原大道 → Jasper",
            route: "Golden → Icefields Parkway → Jasper → Hinton",
            driving: "全天公路旅行，约5h+停留",
            locations: [
                {
                    id: "loc-icefield",
                    name: "Columbia Icefield",
                    type: "scenic",
                    coords: [52.2167, -117.2333],
                    icon: "🧊"
                },
                {
                    id: "loc-jasper",
                    name: "Jasper",
                    type: "city",
                    coords: [52.8737, -118.0814],
                    icon: "📍"
                }
            ],
            attractions: [
                {
                    id: "bow-lake",
                    name: "Bow Lake",
                    icon: "🏔️",
                    duration: "30min",
                    ticket: "免费",
                    needReserve: false,
                    coords: [51.6667, -116.4500],
                    description: "冰原大道上的第一个惊喜，Crowfoot冰川脚下的宝蓝色湖泊。",
                    highlights: ["湖畔红色木屋", "Crowfoot冰川远眺", "停车即景"],
                    reviews: [
                        { author: "公路旅行者", rating: "⭐⭐⭐⭐⭐", text: "开到这里就知道冰原大道名不虚传了" }
                    ]
                },
                {
                    id: "peyto-lake",
                    name: "Peyto Lake 佩托湖",
                    icon: "💎",
                    duration: "45min",
                    ticket: "免费",
                    needReserve: false,
                    coords: [51.7167, -116.5167],
                    description: "从观景台俯瞰整个湖面，形似狐狸头，颜色随季节变化。9月底呈深蓝绿色。",
                    highlights: ["狐狸头形状俯瞰", "观景台短步道", "最佳拍摄角度"],
                    reviews: [
                        { author: "航拍达人", rating: "⭐⭐⭐⭐⭐", text: "形状太独特了，观景台走10分钟就到，必停" }
                    ]
                },
                {
                    id: "columbia-icefield",
                    name: "Columbia Icefield 哥伦比亚冰原",
                    icon: "🧊",
                    duration: "1-2h",
                    ticket: "观景免费 / 冰川探险 CAD$100+",
                    needReserve: false,
                    reserveNote: "商业项目建议提前预订",
                    coords: [52.2167, -117.2333],
                    description: "北美最大的冰原之一，冰川直接可见。可选择参加冰川大巴或天空步道项目。",
                    highlights: ["冰原远眺", "Glacier Skywalk（可选）", "游客中心"],
                    reviews: [
                        { author: "探险家", rating: "⭐⭐⭐⭐", text: "光是站在路边看冰川就很震撼，商业项目看个人兴趣" }
                    ]
                },
                {
                    id: "athabasca-falls",
                    name: "Athabasca Falls",
                    icon: "💧",
                    duration: "30min",
                    ticket: "免费",
                    needReserve: false,
                    coords: [52.6653, -117.8831],
                    description: "落差虽然只有23米，但水量巨大极其壮观，峡谷被水流切割出奇特形状。",
                    highlights: ["多角度观瀑平台", "峡谷地貌", "水雾彩虹"],
                    reviews: [
                        { author: "瀑布控", rating: "⭐⭐⭐⭐⭐", text: "9月水量很大，轰鸣声震耳，比照片壮观10倍" }
                    ]
                }
            ],
            hotel: {
                id: "hotel-hinton",
                name: "Holiday Inn Hinton",
                price: 650,
                currency: "CNY",
                rating: 4.1,
                reason: "Hinton比Jasper镇住宿便宜40%，距Jasper仅20分钟车程，且明早去Maligne Lake顺路",
                coords: [53.3942, -117.5619],
                tags: ["性价比高", "设施齐全", "餐厅方便"],
                reviews: [
                    { author: "精打细算", rating: "⭐⭐⭐⭐", text: "比Jasper镇便宜很多，房间干净够大，楼下就有餐厅" },
                    { author: "自驾客", rating: "⭐⭐⭐⭐", text: "第二天去Maligne Lake不用走回头路，很聪明的住宿选择" }
                ],
                alternatives: [
                    { name: "Jasper Downtown Hostel", price: 450, distance: "Jasper镇内", reason: "预算友好，位置好，但房间较小" },
                    { name: "Fairmont Jasper Park Lodge", price: 2200, distance: "Jasper湖边", reason: "奢华体验，湖景木屋，适合特殊纪念日" }
                ]
            }
        },
        {
            day: 5,
            date: "9月29日",
            title: "Jasper → Edmonton",
            route: "Hinton → Jasper → Edmonton Airport",
            driving: "Jasper→Edmonton 约3.5h",
            locations: [
                {
                    id: "loc-maligne",
                    name: "Maligne Lake",
                    type: "scenic",
                    coords: [52.7297, -117.6094],
                    icon: "💎"
                }
            ],
            attractions: [
                {
                    id: "medicine-lake",
                    name: "Medicine Lake",
                    icon: "🏔️",
                    duration: "20min",
                    ticket: "免费",
                    needReserve: false,
                    coords: [52.8833, -117.4333],
                    description: "神秘的'消失湖'——湖水会通过地下河系统消失，秋季水位较低露出湖底。",
                    highlights: ["地质奇观", "路边观景", "秋色"],
                    reviews: [
                        { author: "地质爱好者", rating: "⭐⭐⭐⭐", text: "9月底水位很低，能看到湖底的河道痕迹，很神奇" }
                    ]
                },
                {
                    id: "maligne-lake",
                    name: "Maligne Lake",
                    icon: "💎",
                    duration: "2h",
                    ticket: "免费（游船另付）",
                    needReserve: false,
                    coords: [52.7297, -117.6094],
                    description: "落基山脉最大的天然湖泊，Spirit Island是标志性景观，需乘船前往。",
                    highlights: ["湖边步道", "Spirit Island游船（可选）", "野生动物"],
                    reviews: [
                        { author: "摄影师", rating: "⭐⭐⭐⭐⭐", text: "Spirit Island是明信片级景观，但不坐船也能在湖边拍到很好的照片" }
                    ]
                }
            ],
            hotel: {
                id: "hotel-edmonton",
                name: "Edmonton Airport Marriott",
                price: 720,
                currency: "CNY",
                rating: 4.2,
                reason: "明天12:30飞Yellowknife，住机场旁免去早起赶路，还车也方便",
                coords: [53.3097, -113.5806],
                tags: ["机场步行可达", "还车方便", "早餐6点开"],
                reviews: [
                    { author: "转机旅客", rating: "⭐⭐⭐⭐", text: "到机场走路5分钟，还车点就在旁边" }
                ],
                alternatives: [
                    { name: "Four Points by Sheraton Edmonton Airport", price: 580, distance: "机场旁", reason: "更便宜，有免费接驳" }
                ]
            }
        },
        {
            day: 6,
            date: "9月30日",
            title: "飞往黄刀镇看极光",
            route: "Edmonton → Yellowknife（飞行2h）",
            driving: null,
            locations: [
                {
                    id: "loc-yellowknife",
                    name: "Yellowknife",
                    type: "city",
                    coords: [62.4540, -114.3718],
                    icon: "🌌"
                }
            ],
            attractions: [
                {
                    id: "aurora-night1",
                    name: "极光观测（第一晚）",
                    icon: "🌌",
                    duration: "4-5h",
                    ticket: "极光团 CAD$100-150",
                    needReserve: true,
                    reserveNote: "建议提前预订极光观测团",
                    coords: [62.4540, -114.3718],
                    description: "Yellowknife位于极光带正下方，9月底是极光季黄金期，晴天看到概率>90%。",
                    highlights: ["专业向导带领", "远离光污染", "极光摄影指导"],
                    reviews: [
                        { author: "极光猎人", rating: "⭐⭐⭐⭐⭐", text: "去了两晚都看到了！第一晚是绿色，第二晚居然有紫色" },
                        { author: "摄影师", rating: "⭐⭐⭐⭐⭐", text: "向导会教你怎么设置相机参数，完全不用担心拍不到" }
                    ]
                }
            ],
            hotel: {
                id: "hotel-yellowknife",
                name: "Explorer Hotel Yellowknife",
                price: 950,
                currency: "CNY",
                rating: 4.3,
                reason: "黄刀镇最大的酒店，位置中心，看完极光凌晨回来停车方便",
                coords: [62.4540, -114.3718],
                tags: ["市中心", "暖气充足", "极光叫醒服务"],
                reviews: [
                    { author: "极光旅客", rating: "⭐⭐⭐⭐", text: "前台会提醒你极光出现，有些房间窗户朝北可以直接看到弱极光" }
                ],
                alternatives: [
                    { name: "Chateau Nova Yellowknife", price: 850, distance: "市中心", reason: "略便宜，房间更新" },
                    { name: "Aurora Village Cabin", price: 1500, distance: "郊外", reason: "木屋住宿+极光观测一体，体验最佳但价格高" }
                ]
            }
        },
        {
            day: 7,
            date: "10月1日",
            title: "黄刀镇 · 极光第二晚",
            route: "Yellowknife 市区",
            driving: null,
            locations: [],
            attractions: [
                {
                    id: "yellowknife-day",
                    name: "Old Town 老城区",
                    icon: "🏘️",
                    duration: "3h",
                    ticket: "免费",
                    needReserve: false,
                    coords: [62.4580, -114.3520],
                    description: "黄刀镇老城区，彩色船屋、Pilot's Monument观景台、当地艺术画廊。",
                    highlights: ["彩色船屋拍照", "Pilot's Monument全景", "当地手工艺品"],
                    reviews: [
                        { author: "旅行者", rating: "⭐⭐⭐⭐", text: "白天可以逛老城区，船屋很有特色" }
                    ]
                },
                {
                    id: "aurora-night2",
                    name: "极光观测（第二晚）",
                    icon: "🌌",
                    duration: "4-5h",
                    ticket: "含在两晚套餐中",
                    needReserve: true,
                    reserveNote: "与第一晚同一极光团",
                    coords: [62.4540, -114.3718],
                    description: "第二晚观测，不同地点，增加看到强极光的概率。",
                    highlights: ["不同观测点", "长曝光摄影", "可能见到极光大爆发"],
                    reviews: []
                }
            ],
            hotel: {
                id: "hotel-yellowknife-2",
                name: "Explorer Hotel Yellowknife",
                price: 950,
                currency: "CNY",
                rating: 4.3,
                reason: "连住两晚，行李不用动，白天可以休息为晚上看极光养精神",
                coords: [62.4540, -114.3718],
                tags: ["连住", "熟悉环境"],
                reviews: [],
                alternatives: []
            }
        },
        {
            day: 8,
            date: "10月2日",
            title: "飞往温哥华",
            route: "Yellowknife → Vancouver（飞行）",
            driving: null,
            locations: [
                {
                    id: "loc-vancouver",
                    name: "Vancouver",
                    type: "city",
                    coords: [49.2827, -123.1207],
                    icon: "🌊"
                }
            ],
            attractions: [],
            hotel: {
                id: "hotel-vancouver-1",
                name: "Hyatt Regency Vancouver",
                price: 1100,
                currency: "CNY",
                rating: 4.4,
                reason: "市中心核心位置，步行可达Stanley Park、Gastown，后几天城市游最方便",
                coords: [49.2839, -123.1187],
                tags: ["市中心", "步行友好", "海景房可选"],
                reviews: [
                    { author: "城市旅客", rating: "⭐⭐⭐⭐⭐", text: "位置绝佳，出门右转就是Canada Place，左转就是Robson Street购物" }
                ],
                alternatives: [
                    { name: "YWCA Hotel Vancouver", price: 600, distance: "市中心", reason: "预算之选，位置也不错，干净简洁" },
                    { name: "Fairmont Hotel Vancouver", price: 1800, distance: "市中心", reason: "地标性酒店，城堡外观，尊贵体验" }
                ]
            }
        },
        {
            day: 9,
            date: "10月3日",
            title: "温哥华市区",
            route: "Vancouver 市区步行/公交",
            driving: null,
            locations: [],
            attractions: [
                {
                    id: "stanley-park",
                    name: "Stanley Park",
                    icon: "🌲",
                    duration: "3h",
                    ticket: "免费",
                    needReserve: false,
                    coords: [49.3043, -123.1444],
                    description: "北美最大的城市公园之一，Seawall步道可骑行或步行，有图腾柱和海滨风光。",
                    highlights: ["Seawall海滨步道", "图腾柱群", "Prospect Point观景"],
                    reviews: [
                        { author: "跑步爱好者", rating: "⭐⭐⭐⭐⭐", text: "Seawall跑步太爽了，一边是森林一边是大海" }
                    ]
                },
                {
                    id: "gastown",
                    name: "Gastown 煤气镇",
                    icon: "🏘️",
                    duration: "1.5h",
                    ticket: "免费",
                    needReserve: false,
                    coords: [49.2844, -123.1088],
                    description: "温哥华最古老的街区，标志性的蒸汽钟、鹅卵石街道、独立咖啡店和餐厅。",
                    highlights: ["蒸汽钟", "Water Street", "独立咖啡馆"],
                    reviews: [
                        { author: "咖啡控", rating: "⭐⭐⭐⭐", text: "Revolver Coffee是温哥华最好的咖啡馆之一" }
                    ]
                },
                {
                    id: "canada-place",
                    name: "Canada Place",
                    icon: "⛵",
                    duration: "1h",
                    ticket: "免费",
                    needReserve: false,
                    coords: [49.2888, -123.1111],
                    description: "温哥华地标性建筑，白帆造型，海滨步道可看北岸雪山和港口。",
                    highlights: ["海滨步道", "北岸雪山全景", "邮轮港"],
                    reviews: [
                        { author: "旅行者", rating: "⭐⭐⭐⭐", text: "天气好的时候能看到北岸雪山倒映在海面上" }
                    ]
                }
            ],
            hotel: {
                id: "hotel-vancouver-2",
                name: "Hyatt Regency Vancouver",
                price: 1100,
                currency: "CNY",
                rating: 4.4,
                reason: "连住三晚，温哥华市区游不需要换酒店",
                coords: [49.2839, -123.1187],
                tags: ["连住"],
                reviews: [],
                alternatives: []
            }
        },
        {
            day: 10,
            date: "10月4日",
            title: "Victoria 一日游",
            route: "Vancouver → Ferry → Victoria → Ferry → Vancouver",
            driving: "含渡轮约2h单程",
            locations: [
                {
                    id: "loc-victoria",
                    name: "Victoria",
                    type: "city",
                    coords: [48.4284, -123.3656],
                    icon: "🏛️"
                }
            ],
            attractions: [
                {
                    id: "bc-ferry",
                    name: "BC Ferries 渡轮",
                    icon: "⛴️",
                    duration: "1.5h单程",
                    ticket: "自驾往返约 CAD$120",
                    needReserve: true,
                    reserveNote: "建议提前预订09:00去程 + 18:00回程",
                    coords: [49.0067, -123.1317],
                    description: "从Tsawwassen到Swartz Bay的渡轮，沿途经过Gulf Islands群岛，风景绝美。",
                    highlights: ["甲板看海岛群", "回程看日落", "船上有餐厅"],
                    reviews: [
                        { author: "风景党", rating: "⭐⭐⭐⭐⭐", text: "18:00回程正好看日落，海面金光闪闪" }
                    ]
                },
                {
                    id: "butchart-gardens",
                    name: "Butchart Gardens 布查特花园",
                    icon: "🌺",
                    duration: "2h",
                    ticket: "CAD$40",
                    needReserve: false,
                    coords: [48.5635, -123.4706],
                    description: "百年历史的花园，由废弃矿坑改造，秋季有大丽花和日本花园红叶。",
                    highlights: ["下沉花园", "日本花园秋色", "意大利花园"],
                    reviews: [
                        { author: "花园爱好者", rating: "⭐⭐⭐⭐⭐", text: "10月初秋色正好，下沉花园从上往下看太震撼了" }
                    ]
                },
                {
                    id: "victoria-downtown",
                    name: "Victoria Inner Harbour",
                    icon: "🏛️",
                    duration: "2h",
                    ticket: "免费",
                    needReserve: false,
                    coords: [48.4215, -123.3687],
                    description: "维多利亚内港，BC省议会大厦和帝后酒店环绕，英伦风情浓郁。",
                    highlights: ["BC Parliament外观", "Fairmont Empress外观", "Government Street"],
                    reviews: [
                        { author: "历史爱好者", rating: "⭐⭐⭐⭐", text: "很有英国小城的感觉，港口边坐着看船很惬意" }
                    ]
                }
            ],
            hotel: {
                id: "hotel-vancouver-3",
                name: "Hyatt Regency Vancouver",
                price: 1100,
                currency: "CNY",
                rating: 4.4,
                reason: "Victoria当日往返，晚上回温哥华继续住同一家",
                coords: [49.2839, -123.1187],
                tags: ["连住"],
                reviews: [],
                alternatives: []
            }
        },
        {
            day: 11,
            date: "10月5日",
            title: "Richmond · 购物 · 准备返程",
            route: "Vancouver → Richmond → Airport",
            driving: "约30min",
            locations: [
                {
                    id: "loc-richmond",
                    name: "Richmond",
                    type: "city",
                    coords: [49.1666, -123.1336],
                    icon: "🛍️"
                }
            ],
            attractions: [
                {
                    id: "richmond",
                    name: "Richmond 购物",
                    icon: "🛍️",
                    duration: "4h",
                    ticket: "免费",
                    needReserve: false,
                    coords: [49.1666, -123.1336],
                    description: "大温地区最大的华人聚集区，Aberdeen Centre等商场，还有地道中餐。",
                    highlights: ["McArthurGlen Outlet", "Aberdeen Centre", "中餐美食"],
                    reviews: [
                        { author: "购物达人", rating: "⭐⭐⭐⭐", text: "Outlet可以逛大半天，加拿大鹅比国内便宜不少" }
                    ]
                }
            ],
            hotel: {
                id: "hotel-yvr",
                name: "Fairmont Vancouver Airport",
                price: 1300,
                currency: "CNY",
                rating: 4.6,
                reason: "凌晨1:05航班，住航站楼内酒店可以最大化休息时间，步行即达登机口",
                coords: [49.1947, -123.1815],
                tags: ["航站楼内", "隔音极佳", "步行登机", "可延迟退房"],
                reviews: [
                    { author: "红眼航班旅客", rating: "⭐⭐⭐⭐⭐", text: "凌晨航班的最佳选择，睡到11点退房，逛完再回来等飞机" },
                    { author: "商务旅客", rating: "⭐⭐⭐⭐⭐", text: "隔音顶级，完全听不到飞机噪音，五星级的品质" }
                ],
                alternatives: [
                    { name: "Radisson Vancouver Airport", price: 650, distance: "5分钟接驳", reason: "预算友好，有24小时接驳车" }
                ]
            }
        },
        {
            day: 12,
            date: "10月6日",
            title: "返程",
            route: "Vancouver → 上海",
            driving: null,
            locations: [],
            attractions: [],
            hotel: null
        }
    ]
};

const MAP_ROUTE_COORDS = [
    [51.1215, -114.0076],  // Calgary
    [51.1784, -115.5708],  // Banff
    [51.4433, -116.5317],  // Yoho/Emerald Lake
    [51.2965, -116.9689],  // Golden
    [51.4167, -116.1667],  // Lake Louise
    [51.2965, -116.9689],  // Golden (back)
    [51.6667, -116.4500],  // Bow Lake
    [51.7167, -116.5167],  // Peyto Lake
    [52.2167, -117.2333],  // Columbia Icefield
    [52.6653, -117.8831],  // Athabasca Falls
    [52.8737, -118.0814],  // Jasper
    [53.3942, -117.5619],  // Hinton
    [53.3097, -113.5806],  // Edmonton
    [62.4540, -114.3718],  // Yellowknife
    [49.2827, -123.1207],  // Vancouver
    [48.4284, -123.3656],  // Victoria
    [49.2827, -123.1207],  // Vancouver (back)
];
