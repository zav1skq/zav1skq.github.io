/* PULSE — демо Telegram Mini App для портфолио: запись на групповые тренировки.
   Клуб вымышленный: название, контакты, тренеры, цены и расписание — примерные данные.
   Число мест в группах и занятость — тоже пример, см. CONFIG.demoSeats. */
(() => {
  'use strict';

  /* ================= НАСТРОЙКИ КЛУБА ================= */
  const CONFIG = {
    clubName: 'PULSE',
    address: 'ул. Спортивная, 1',
    addressShort: 'ул. Спортивная, 1',
    phone: '+7 (000) 000-00-00',
    phoneHref: '#',
    telegramName: '@pulse_fitness_demo',
    siteName: 'pulse-fitness.demo',
    scheduleFrom: 'октября 2026', // с какого месяца действует расписание

    openDay: 'today',   // с какого дня открывается расписание: 'today' — сегодня, 'monday' — всегда понедельник
    lockPast: true,     // на начавшиеся и прошедшие занятия записаться нельзя
    weeksAhead: 2,      // на сколько недель вперёд можно листать
    minFreeWindow: 90,  // перерывы между занятиями короче (мин) не показываются как «свободное время»

    demoSeats: true,    // ПРИМЕР: число мест и занятость групп. На сайте этих данных нет —
                        // в рабочей версии их отдаёт CRM клуба. false — блок «мест» скрыт.
  };
  // вместимость групп по категориям — используется только при demoSeats
  const CAP = { def: 14, yoga: 14, pilates: 14, stretch: 14, step: 12, func: 12, cycle: 10, health: 12 };

  // иллюстрации лежат в папке img/ рядом с приложением (нарисованы для демо, без фотографий)
  const LOGO = 'img/logo.svg';
  const dimg = n => `img/art/${n}.svg`;       // направления
  const simg = n => `img/art/s-${n}.svg`;     // услуги
  // аватар тренера: img/coaches/<id>.svg
  const photoOf = tr => `img/coaches/${tr.id}.svg`;
  const thumbOf = tr => `img/coaches/${tr.id}.svg`;

  /* ================= КАТЕГОРИИ (фильтр расписания) ================= */
  const CATS = {
    yoga: { name: 'Йога', icon: 'yoga' },
    pilates: { name: 'Пилатес', icon: 'pilates' },
    stretch: { name: 'Растяжка', icon: 'stretch' },
    step: { name: 'Степ', icon: 'step' },
    func: { name: 'Функционал', icon: 'kettle' },
    cycle: { name: 'Сайкл', icon: 'cycle' },
    health: { name: 'Здоровье', icon: 'heart' },
  };

  /* ================= НАПРАВЛЕНИЯ ================= */
  // classes — какие занятия из расписания относятся к направлению; near — совпадение приблизительное
  const DIRS = {
    pilates: {
      name: 'Pilates', ru: 'пилатес', img: dimg('pilates'), cat: 'pilates',
      desc: 'Спокойная, но глубокая работа с мышцами кора. Улучшает осанку, координацию и гибкость, подходит для любого уровня подготовки.',
      classes: ['pil_mob', 'pil_posture', 'pil_tbs', 'pym'],
    },
    sculpt: {
      name: 'Sculpt', ru: 'аэробная + силовая', img: dimg('sculpt'), near: true,
      desc: 'Кардио и силовые упражнения в одной тренировке: сжигаем калории и укрепляем мышцы за одно занятие.',
      classes: ['step_sculpt'],
    },
    supersculpt: {
      name: 'Super-sculpt', ru: 'усиленный sculpt', img: dimg('super-sculpt'),
      desc: 'Более интенсивная версия Sculpt — для тех, кто уже уверенно тренируется и хочет прибавить нагрузку.',
      classes: [],
    },
    yoga: {
      name: 'Yoga', ru: 'йога', img: dimg('yoga'), cat: 'yoga',
      desc: 'Асаны, дыхание и расслабление. Помогает снять напряжение после рабочего дня и лучше спать.',
      classes: ['yoga', 'pym'],
    },
    stretch: {
      name: 'Stretch', ru: 'растяжка', img: dimg('stretch'), cat: 'stretch',
      desc: 'Мягкая работа над гибкостью и подвижностью суставов. Тело становится лёгким, уходит скованность.',
      classes: ['stretch'],
    },
    step: {
      name: 'Step-interval', ru: 'степ-платформа', img: dimg('step-interval'), cat: 'step', near: true,
      desc: 'Интервальная тренировка на степ-платформе под ритмичную музыку. Отличное кардио и работа на выносливость.',
      classes: ['step_aero', 'step_func', 'step_sculpt', 'step'],
    },
    cycle: {
      name: 'Cycle', ru: 'сайкл', img: dimg('cycle'), cat: 'cycle',
      desc: 'Командная тренировка на велотренажёрах: темп, музыка и много энергии.',
      classes: ['cycle'],
    },
    circular: {
      name: 'Circular', ru: 'круговая тренировка', img: dimg('circular'),
      desc: 'Несколько станций с упражнениями, которые проходятся по кругу. Высокий темп и нагрузка на всё тело.',
      classes: ['circuit'],
    },
    mt: {
      name: 'MT', ru: 'мышечный тонус', img: dimg('mt'), near: true,
      desc: 'Muscle toning: проработка крупных мышц ног, спины, рук и груди с амортизаторами, мини-штангами и степами.',
      classes: ['power', 'fullbody'],
    },
    balet: {
      name: 'Stretch-balet', ru: 'растяжка + балет', img: dimg('stretch-balet'),
      desc: 'Элементы классического танца и растяжка: пластика, осанка и чувство ритма.',
      classes: [],
    },
    trx: {
      name: 'TRX + stretch', ru: 'подвесные петли', img: dimg('trx-stretch'),
      desc: 'Упражнения с весом собственного тела на подвесных петлях и растяжка в конце занятия.',
      classes: ['trx'],
    },
    kidsbalet: {
      name: 'Дети: balet', ru: 'балет для детей', img: dimg('child-balet'), kids: true,
      desc: 'Занятия у станка и первые балетные элементы для детей — в игровой форме и с опытным тренером.',
      classes: [],
    },
    kidsyoga: {
      name: 'Детская йога', ru: 'для самых маленьких', img: dimg('kids-yoga'), kids: true,
      desc: 'Йога для малышей: укрепляем мышцы спины, развиваем координацию и внимание.',
      classes: [],
    },
  };

  /* ================= ЗАНЯТИЯ ИЗ РАСПИСАНИЯ ================= */
  // dir — направление сайта, чьё описание показывается; note — короткое пояснение; img — фото (ключ DIRS)
  const CLASSES = {
    fullbody: { title: 'Фулбади', cat: 'func', img: 'mt', note: 'Тренировка на все группы мышц за одно занятие.' },
    pil_mob: { title: 'Пилатес. Мобильность и сила', cat: 'pilates', dir: 'pilates', img: 'pilates' },
    pil_posture: { title: 'Пилатес. Осанка. Дыхание', cat: 'pilates', dir: 'pilates', img: 'pilates' },
    pil_tbs: { title: 'Пилатес. ТБС. Ягодицы', cat: 'pilates', dir: 'pilates', img: 'pilates', note: 'Акцент на тазобедренные суставы и ягодицы.' },
    pym: { title: 'Пилатес + йога + ролик МФР', cat: 'pilates', img: 'pilates', note: 'Пилатес, йога и миофасциальный релиз с роликом — в одном полуторачасовом занятии.' },
    yoga: { title: 'Йога', cat: 'yoga', dir: 'yoga', img: 'yoga' },
    stretch: { title: 'Растяжка', cat: 'stretch', dir: 'stretch', img: 'stretch' },
    step_aero: { title: 'Степ-аэробика', cat: 'step', img: 'step', note: 'Аэробная тренировка на степ-платформе.' },
    step_func: { title: 'Степ функционал', cat: 'step', img: 'step', note: 'Функциональная тренировка со степ-платформой.' },
    step_sculpt: { title: 'Степ Скульпт', cat: 'step', img: 'sculpt', note: 'Аэробная и силовая нагрузка со степ-платформой.' },
    step: { title: 'Степ', cat: 'step', img: 'step', note: 'Тренировка на степ-платформе.' },
    trx: { title: 'TRX', cat: 'func', dir: 'trx', img: 'trx' },
    func: { title: 'Функциональный тренинг', cat: 'func', img: 'circular', note: 'Тренировка на силу, выносливость и координацию.' },
    power: { title: 'Силовая тренировка', cat: 'func', img: 'mt', note: 'Силовая работа на основные группы мышц.' },
    circuit: { title: 'Круговая тренировка', cat: 'func', dir: 'circular', img: 'circular' },
    animal: { title: 'Animal Flow', cat: 'func', img: 'supersculpt', note: 'Тренировка с собственным весом на основе естественных движений тела.' },
    cycle: { title: 'Сайкл', cat: 'cycle', dir: 'cycle', img: 'cycle' },
    women: { title: 'Женское здоровье', cat: 'health', note: 'Мягкая оздоровительная тренировка для женщин.' },
  };

  /* ================= ТРЕНЕРЫ (вымышленные, для демо) ================= */
  // kind: group — групповые программы, gym — тренажёрный зал, personal — персональный тренер
  const TRAINERS = {
    anna: {
      name: 'Анна Соколова', role: 'Тренер групповых программ', kind: 'group',
      chip: 'стаж 10 лет',
      stats: [['10', 'лет преподаёт'], ['4', 'направления']],
      facts: ['Тренер групповых программ и реабилитолог', 'Ведёт смешанные классы «пилатес + йога»', 'Преподаёт 10 лет'],
      tagsTitle: 'Направления тренировок',
      tags: ['Йога', 'Пилатес', 'Растяжка', 'МФР-ролик'],
    },
    maria: {
      name: 'Мария Лебедева', role: 'Инструктор групповых программ', kind: 'group',
      chip: 'опыт 7 лет',
      stats: [['7', 'лет опыта'], ['5', 'направлений']],
      facts: ['Опыт работы 7 лет', 'Ведёт степ, пилатес и функциональные тренировки', 'Сертифицированный инструктор'],
      tagsTitle: 'Направления',
      tags: ['Степ-аэробика', 'Пилатес', 'Здоровая спина', 'Functional', 'Animal Flow'],
    },
    olga: {
      name: 'Ольга Морозова', role: 'Инструктор йоги', kind: 'group',
      chip: 'стаж 8 лет',
      stats: [['8', 'лет преподаёт'], ['2', 'стиля йоги']],
      facts: ['Сертифицированный инструктор хатха-йоги', 'Ведёт классы для начинающих и продолжающих'],
      tagsTitle: 'Направления',
      tags: ['Хатха-йога', 'Йога для спины', 'Дыхательные практики'],
    },
    ksenia: {
      name: 'Ксения Белова', role: 'Тренер групповых программ', kind: 'group',
      chip: 'степ и силовые',
      stats: [['6', 'лет опыта'], ['3', 'специализации']],
      facts: ['Ведёт вечерние степ- и силовые классы', 'Сертифицированный тренер групповых программ'],
      tagsTitle: 'Специализация',
      tags: ['Степ-аэробика', 'Силовые с утяжелением', 'Сайкл', 'Растяжка'],
    },
    vera: {
      name: 'Вера Павлова', role: 'Тренер групповых программ', kind: 'group',
      chip: 'опыт 5 лет',
      stats: [['5', 'лет опыта'], ['3', 'специализации']],
      facts: ['Сертифицированный тренер', 'Профильное образование в области физической культуры'],
      tagsTitle: 'Специализация',
      tags: ['Мобильность позвоночника', 'Шпагаты', 'Стретчинг'],
    },
    artem: {
      name: 'Артём Ковалёв', role: 'Персональный тренер', kind: 'personal',
      chip: 'стаж 12 лет',
      stats: [['12', 'лет стажа'], ['300+', 'клиентов']],
      facts: ['Персональный тренер со стажем 12 лет', 'Составляет программы под цель: снижение веса, сила, рельеф'],
      tagsTitle: 'Направления работы',
      tags: ['Коррекция фигуры', 'Силовой тренинг', 'Питание'],
    },
    eva: {
      name: 'Ева Григорьева', role: 'Персональный тренер', kind: 'personal',
      chip: 'силовой тренинг',
      stats: [['6', 'лет опыта'], ['КМС', 'по пауэрлифтингу']],
      facts: ['Сертифицированный инструктор тренажёрного зала', 'КМС по пауэрлифтингу', 'Опыт работы 6 лет'],
      tagsTitle: 'Направление работы',
      tags: ['Индивидуальные программы', 'Силовой тренинг', 'Коррекция фигуры'],
    },
    denis: {
      name: 'Денис Орлов', role: 'Персональный тренер', kind: 'personal',
      chip: 'мастер спорта',
      stats: [['МС', 'мастер спорта'], ['15', 'лет в спорте']],
      facts: ['Мастер спорта по тяжёлой атлетике', 'Работает со спортсменами и новичками', 'Консультирует по восстановлению'],
      tagsTitle: 'Направления работы',
      tags: ['Тяжёлая атлетика', 'Силовой тренинг', 'ОФП', 'Восстановление'],
    },
    ilya: {
      name: 'Илья Крылов', role: 'Инструктор тренажёрного зала', kind: 'gym',
      chip: 'опыт 10 лет',
      stats: [['10', 'лет опыта'], ['КМС', 'по пауэрлифтингу']],
      facts: ['Опыт работы в фитнесе 10 лет', 'Поставит технику базовых упражнений', 'Поможет составить план тренировок'],
    },
    roman: {
      name: 'Роман Зайцев', role: 'Инструктор тренажёрного зала', kind: 'gym',
      chip: 'опыт 8 лет',
      stats: [['8', 'лет опыта']],
      facts: ['Профильное спортивное образование', 'Работает с новичками и после перерыва в тренировках', 'Разбирается в спортивном питании'],
    },
    kirill: {
      name: 'Кирилл Фёдоров', role: 'Инструктор тренажёрного зала', kind: 'gym',
      chip: 'бодибилдинг',
      stats: [['9', 'лет в фитнесе'], ['КМС', 'по бодибилдингу']],
      facts: ['КМС по бодибилдингу', 'Сертифицированный инструктор', 'Помогает набрать мышечную массу'],
    },
    pavel: {
      name: 'Павел Никитин', role: 'Инструктор тренажёрного зала', kind: 'gym',
      chip: 'опыт 11 лет',
      stats: [['11', 'лет тренером']],
      facts: ['Тренер по силовым видам спорта', 'Работает с восстановлением после травм', '11 лет опыта работы тренером'],
      quote: 'Результат — это регулярность, а не героизм!',
    },
    // ведут занятия по расписанию, но без отдельного профиля (stub — показываются инициалы)
    polina: { name: 'Полина', role: 'Тренер групповых программ', kind: 'group', stub: true },
    alina: { name: 'Алина', role: 'Тренер групповых программ', kind: 'group', stub: true },
  };
  Object.entries(TRAINERS).forEach(([id, t]) => { t.id = id; });
  const KINDS = { group: 'Групповые', gym: 'Тренажёрный зал', personal: 'Персональные' };
  // порядок в ленте на главной: сначала те, кто ведёт групповые
  const HOME_TRAINERS = ['anna', 'maria', 'olga', 'ksenia', 'vera', 'artem', 'eva', 'denis', 'ilya', 'roman', 'kirill', 'pavel'];

  /* ================= РАСПИСАНИЕ НЕДЕЛИ (примерное) ================= */
  // C(начало, конец, занятие из CLASSES, тренер из TRAINERS или null)
  const C = (s, e, c, t) => ({ s, e, c, t });
  const SCHEDULE = [
    [ // Понедельник
      C('08:15', '09:15', 'fullbody', 'polina'),
      C('09:30', '10:30', 'pil_mob', 'maria'),
      C('10:30', '11:30', 'step_aero', 'maria'),
      C('11:30', '13:00', 'pym', 'anna'),
      C('19:00', '20:00', 'step_sculpt', 'ksenia'),
      C('20:00', '21:00', 'stretch', 'ksenia'),
    ],
    [ // Вторник
      C('10:00', '11:00', 'step_func', 'maria'),
      C('11:00', '12:00', 'stretch', 'maria'),
      C('12:00', '13:00', 'pil_posture', null), // тренер уточняется
      C('17:00', '18:30', 'yoga', 'olga'),
      C('18:30', '20:00', 'pym', 'anna'),
    ],
    [ // Среда
      C('08:15', '09:15', 'trx', 'polina'),
      C('09:30', '10:30', 'pil_tbs', 'maria'),
      C('10:30', '11:30', 'func', 'maria'),
      C('11:30', '13:00', 'pym', 'anna'),
      C('15:00', '16:00', 'stretch', 'alina'),
      C('16:00', '17:00', 'stretch', 'alina'),
      C('17:00', '18:00', 'power', 'ksenia'),
      C('18:00', '19:00', 'cycle', 'ksenia'),
      C('19:00', '20:00', 'stretch', 'ksenia'),
    ],
    [ // Четверг
      C('10:00', '11:00', 'step_aero', 'maria'),
      C('11:00', '12:00', 'animal', 'maria'),
      C('12:00', '13:00', 'women', 'maria'),
      C('17:00', '18:30', 'yoga', 'olga'),
      C('18:30', '20:00', 'pym', 'anna'),
    ],
    [ // Пятница
      C('08:15', '09:15', 'circuit', 'polina'),
      C('11:00', '12:30', 'pym', 'anna'),
      C('18:00', '19:00', 'cycle', 'ksenia'),
      C('19:00', '20:00', 'step_sculpt', 'ksenia'),
      C('20:00', '21:00', 'stretch', 'ksenia'),
    ],
    [ // Суббота
      C('10:30', '12:00', 'yoga', 'olga'),
      C('13:00', '14:00', 'stretch', 'alina'),
      C('14:00', '15:00', 'stretch', 'alina'),
      C('15:00', '16:30', 'pym', 'anna'),
    ],
    [ // Воскресенье
      C('10:30', '12:00', 'yoga', 'olga'),
      C('12:00', '13:00', 'step', 'maria'),
      C('13:00', '14:00', 'stretch', 'alina'),
      C('14:00', '15:00', 'stretch', 'alina'),
    ],
  ];

  /* ================= ЦЕНЫ, СКИДКИ, УСЛУГИ (примерные) ================= */
  const HALLS = 'Тренажёрный и аэробный зал, сауна';
  const PRICES = {
    cards: {
      name: 'Карты',
      items: [
        { t: 'Гостевой визит', s: '1 посещение', rows: [['Тренажёрный зал', '500 ₽'], ['Групповое занятие', '500 ₽']] },
        { t: 'Карта 8 посещений', s: 'в течение 30 дней', rows: [[HALLS, '2 900 ₽']] },
        { t: 'Карта 12 посещений', s: '30 дней · заморозка 3 дня', rows: [[HALLS, '3 800 ₽']] },
        { t: 'Безлимит 1 месяц', s: 'заморозка 7 дней', rows: [['Тренажёрный зал', '4 200 ₽'], [HALLS, '4 700 ₽']] },
        { t: 'Безлимит 3 месяца', s: 'заморозка 15 дней', rows: [['Тренажёрный зал', '11 500 ₽'], [HALLS, '12 900 ₽']] },
        { t: 'Безлимит 6 месяцев', s: 'заморозка 30 дней', rows: [[HALLS, '23 000 ₽']] },
        { t: 'Безлимит 12 месяцев', s: 'заморозка 60 дней', rows: [[HALLS, '36 000 ₽']], best: true },
      ],
    },
    student: {
      name: 'Студентам',
      items: [
        { t: 'Студенческая карта 8 посещений', s: '30 дней', rows: [[HALLS, '2 300 ₽']] },
        { t: 'Студенческая карта 12 посещений', s: '30 дней', rows: [[HALLS, '3 200 ₽']] },
        { t: 'Студенческая карта безлимит', s: '30 дней', rows: [['Зависит от набора залов', '3 700 – 4 200 ₽']] },
      ],
    },
    coach: {
      name: 'С тренером',
      items: [
        { t: 'Первое занятие с тренером', s: 'для новых клиентов', rows: [['Знакомство с залом и тренером', 'бесплатно', '900 ₽']], best: true },
        { t: 'Персональная тренировка', s: '1 занятие', rows: [['Без абонемента', '1 500 ₽'], ['С действующим абонементом', '1 000 ₽']] },
        { t: 'Тренировка с ведущим тренером', s: '1 занятие', rows: [['Персональная тренировка', '2 000 ₽']] },
      ],
    },
    massage: {
      name: 'Массаж',
      items: [
        { t: 'Общий', rows: [['женский', '1 600 ₽'], ['мужской', '2 200 ₽']] },
        { t: 'Спортивный', rows: [['', '1 900 ₽']] },
        { t: 'Спина', rows: [['женский', '1 300 ₽'], ['мужской', '1 500 ₽']] },
        { t: 'Ноги', rows: [['', '1 100 ₽']] },
        { t: 'Шейно-воротниковая зона', rows: [['', '1 000 ₽']] },
        { t: 'Антицеллюлитный', rows: [['', '1 800 ₽']] },
      ],
    },
  };
  const LOYALTY = [
    ['−10%', 'Постоянным клиентам', 'Тем, кто посещает фитнес-студию не менее 6 месяцев'],
    ['−15%', 'Семейная карта', 'Абонементы для двух или более членов семьи одновременно'],
    ['−15%', 'Корпоративная карта', 'При покупке от 5 абонементов'],
    ['−20%', 'Корпоративная карта', 'При покупке от 10 абонементов'],
    ['−15%', 'В день рождения', 'Всем клиентам при предъявлении документа'],
  ];
  const SERVICES = [
    { name: 'Тренажерный зал', img: simg('gym'), text: 'Современные тренажеры и опытные тренеры' },
    { name: 'Персональные тренировки', img: simg('personal'), text: 'План под ваши цели и возможности', act: 'open-trainers' },
    { name: 'Групповые тренировки', img: simg('group'), text: '', act: 'open-schedule' },
    { name: 'Бокс', img: simg('boxing'), text: 'В группе или индивидуально. Груша входит в абонемент' },
    { name: 'Массаж', img: simg('massage'), text: 'От 1 000 ₽', act: 'open-massage' },
    { name: 'Сауна', img: simg('sauna'), text: 'Бесплатно с услугами клуба' },
  ];

  /* ================= ИКОНКИ ================= */
  const I = {
    left: '<path d="M14.5 6l-6 6 6 6"/>',
    right: '<path d="M9.5 6l6 6-6 6"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    timer: '<circle cx="12" cy="13.5" r="7"/><path d="M12 10v3.5l2.2 1.5M9.5 3.5h5"/>',
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    users: '<circle cx="9" cy="8" r="3.3"/><path d="M2.8 19.5a6.2 6.2 0 0 1 12.4 0"/><path d="M15.5 4.9a3.3 3.3 0 0 1 0 6.3"/><path d="M17.8 13.6a6.2 6.2 0 0 1 3.4 5.9"/>',
    user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M3.5 10h17M8.5 3v4M15.5 3v4"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.8v2M12 19.2v2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M2.8 12h2M19.2 12h2M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 7.8v.2"/>',
    bell: '<path d="M6.5 16v-5a5.5 5.5 0 0 1 11 0v5l1.5 2h-14z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    home: '<path d="M4 10.8 12 4l8 6.8V19a1.5 1.5 0 0 1-1.5 1.5h-4v-5.2h-5v5.2h-4A1.5 1.5 0 0 1 4 19z"/>',
    book: '<path d="M6.5 3.8h11A1.5 1.5 0 0 1 19 5.3v15l-7-4-7 4v-15a1.5 1.5 0 0 1 1.5-1.5z"/><path d="m9 9.8 2.2 2.2L15 8.2"/>',
    dumbbell: '<path d="M7 6.5v11M3.8 9.3v5.4M17 6.5v11M20.2 9.3v5.4M7 12h10"/>',
    phone: '<path d="M6.8 3.5h2.5l1.4 4-2 1.5a12 12 0 0 0 6.3 6.3l1.5-2 4 1.4v2.5a2 2 0 0 1-2.2 2A16.6 16.6 0 0 1 4.8 5.7a2 2 0 0 1 2-2.2z"/>',
    send: '<path d="M20.5 4 3.5 10.8l5.3 2 2 5.7 3-3.9 4.2 3.4z"/><path d="m8.8 12.8 6.6-4.8"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.7 2.9 2.7 14.1 0 17M12 3.5c-2.7 2.9-2.7 14.1 0 17"/>',
    parking: '<rect x="4" y="4" width="16" height="16" rx="4.5"/><path d="M10 16.5V8h2.6a2.5 2.5 0 0 1 0 5H10"/>',
    spark: '<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z"/><path d="M18.5 16.5v4M16.5 18.5h4"/>',
    yoga: '<circle cx="12" cy="4.8" r="2"/><path d="M12 8.5v5"/><path d="M6.5 10.5l5.5 3 5.5-3"/><path d="M4 19.5c2.5-1.8 5-2.7 8-2.7s5.5.9 8 2.7"/><path d="M8.5 17.3l3.5-3.8 3.5 3.8"/>',
    cycle: '<circle cx="6" cy="16.5" r="3.5"/><circle cx="18" cy="16.5" r="3.5"/><path d="M6 16.5l3.5-7h6L18 16.5"/><path d="M9.5 9.5l2.5 7H6"/><path d="M8 6.5h3M15.5 9.5l-1-3H17"/>',
    pilates: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.2"/><path d="M3.5 12h4.3M16.2 12h4.3"/>',
    stretch: '<circle cx="15.5" cy="4.5" r="2"/><path d="M4 12.5l5-1.5 3 2 2.5-5 5.5-1"/><path d="M12 13l-2.5 7.5M12 13l4.5 3 1 4"/>',
    step: '<path d="M3.5 10.5h17l-1.6 5H5.1z"/><path d="M6.5 15.5v3M17.5 15.5v3M8.5 10.5v-3h7v3"/>',
    kettle: '<path d="M9 7.6V7a3 3 0 0 1 6 0v.6"/><path d="M8.6 7.6h6.8a1.6 1.6 0 0 1 1.4 2.4 6.2 6.2 0 1 1-9.6 0 1.6 1.6 0 0 1 1.4-2.4z"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10.3A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"/>',
  };
  const ic = (name, cls = '') =>
    `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name] || ''}</svg>`;

  /* ================= TELEGRAM ================= */
  const tg = window.Telegram && window.Telegram.WebApp;
  const inTg = !!(tg && tg.platform && tg.platform !== 'unknown');
  const ver = v => inTg && typeof tg.isVersionAtLeast === 'function' && tg.isVersionAtLeast(v);
  const hasTgBack = ver('6.1');
  const user = (inTg && tg.initDataUnsafe && tg.initDataUnsafe.user) || null;

  const haptic = {
    tap() { if (ver('6.1')) try { tg.HapticFeedback.impactOccurred('light'); } catch (e) {} },
    select() { if (ver('6.1')) try { tg.HapticFeedback.selectionChanged(); } catch (e) {} },
    ok() { if (ver('6.1')) try { tg.HapticFeedback.notificationOccurred('success'); } catch (e) {} },
    warn() { if (ver('6.1')) try { tg.HapticFeedback.notificationOccurred('warning'); } catch (e) {} },
  };

  if (inTg) {
    try { tg.ready(); tg.expand(); } catch (e) {}
    if (ver('6.9')) try { tg.setHeaderColor('#0d0d0d'); tg.setBackgroundColor('#0d0d0d'); } catch (e) {}
    if (ver('7.10')) try { tg.setBottomBarColor('#0d0d0d'); } catch (e) {}
    if (ver('7.7')) try { tg.disableVerticalSwipes(); } catch (e) {}
    if (hasTgBack) tg.BackButton.onClick(() => goBack());
  }

  // если какая-то картинка не загрузилась — прячем её, под ней остаётся заглушка (инициалы или значок)
  document.addEventListener('error', e => {
    if (e.target && e.target.tagName === 'IMG') e.target.classList.add('img-fail');
  }, true);

  /* ================= ДАТЫ И ТЕКСТ ================= */
  const DAY_NAMES = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  const DAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

  const pad = n => String(n).padStart(2, '0');
  const wdOf = d => (d.getDay() + 6) % 7; // 0 = понедельник
  const dayStart = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const startOfWeek = d => { const x = dayStart(d); return addDays(x, -wdOf(x)); };
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const fmtMin = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const fmtDur = m => { const h = Math.floor(m / 60), mm = m % 60; return [h ? `${h} ч` : '', mm ? `${mm} мин` : ''].filter(Boolean).join(' '); };
  const plural = (n, one, few, many) => {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b === 1) return one;
    if (b >= 2 && b <= 4) return few;
    return many;
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dateLong = d => `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
  const rangeLabel = ws => {
    const we = addDays(ws, 6);
    return ws.getMonth() === we.getMonth()
      ? `${ws.getDate()} – ${we.getDate()} ${MONTHS_GEN[we.getMonth()]}`
      : `${dateLong(ws)} – ${dateLong(we)}`;
  };
  const nClasses = n => `${n} ${plural(n, 'занятие', 'занятия', 'занятий')}`;
  const nSeats = n => `${n} ${plural(n, 'место', 'места', 'мест')}`;

  // детерминированное «случайное» число 0..1 — чтобы демо-занятость групп не прыгала
  const rand = seed => {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  };

  /* ================= ДАННЫЕ ДНЯ ================= */
  function getSlots(date) {
    const day = dayStart(date), k = keyOf(day), wd = wdOf(day);
    return (SCHEDULE[wd] || []).map((x, idx) => {
      const cls = CLASSES[x.c], id = `${k}_${idx}`;
      const start = toMin(x.s), end = toMin(x.e);
      const cap = CAP[cls.cat] || CAP.def;
      const r = rand(id);
      const base = !CONFIG.demoSeats ? 0 : r > 0.9 ? cap : Math.round(cap * (0.25 + r * 0.7));
      return {
        id, idx, dateKey: k, date: day, wd, start, end, dur: end - start,
        key: x.c, cls, cat: cls.cat, title: cls.title,
        tr: x.t, trainer: x.t ? TRAINERS[x.t] : null, cap, base,
      };
    }).sort((a, b) => a.start - b.start);
  }

  function getSlotById(id) {
    const cut = id.lastIndexOf('_');
    if (cut < 0) return null;
    const k = id.slice(0, cut), idx = Number(id.slice(cut + 1));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return null;
    return getSlots(parseKey(k)).find(s => s.idx === idx) || null;
  }

  function slotInfo(s) {
    const b = state.bookings[s.id];
    const mine = !!b && b.st === 'booked';
    const wait = !!b && b.st === 'wait';
    const booked = Math.min(s.cap, s.base + (mine ? 1 : 0));
    const free = s.cap - booked;
    const now = Date.now(), t0 = s.date.getTime() + s.start * 60000, t1 = s.date.getTime() + s.end * 60000;
    const started = CONFIG.lockPast && now >= t0;
    const ended = CONFIG.lockPast && now >= t1;
    return { mine, wait, booked, free, full: CONFIG.demoSeats && free <= 0 && !mine, started, ended, live: started && !ended };
  }

  // перерывы между занятиями дня
  function freeWindows(slots) {
    const iv = slots.map(s => [s.start, s.end]).sort((a, b) => a[0] - b[0]);
    const out = [];
    let cur = null;
    for (const [a, b] of iv) {
      if (cur != null && a - cur >= CONFIG.minFreeWindow) out.push([cur, a]);
      cur = cur == null ? b : Math.max(cur, b);
    }
    return out;
  }

  // занятия на ближайшие дни, которые ещё не начались
  function upcomingSlots(pred, days = 7) {
    const base = dayStart(new Date());
    const out = [];
    for (let i = 0; i < days; i++) {
      for (const s of getSlots(addDays(base, i))) if (!slotInfo(s).started && pred(s)) out.push(s);
    }
    return out;
  }
  // ближайший день, в котором ещё есть занятия
  function nextDay() {
    const base = dayStart(new Date());
    for (let i = 0; i < 8; i++) {
      const list = getSlots(addDays(base, i)).filter(s => !slotInfo(s).started);
      if (list.length) return { i, date: addDays(base, i), list };
    }
    return null;
  }

  const weekStart = () => addDays(startOfWeek(new Date()), state.weekOffset * 7);
  // на каком дне открывать расписание: в режиме 'today' — сегодня, а если сегодня занятий
  // уже не осталось — ближайший день, где они есть; в режиме 'monday' — понедельник
  function defaultPos() {
    if (CONFIG.openDay !== 'today') return { weekOffset: 0, day: 0 };
    const today = dayStart(new Date());
    const nd = nextDay();
    const date = nd ? nd.date : today;
    const weekOffset = Math.round((startOfWeek(date) - startOfWeek(today)) / (7 * 864e5));
    return weekOffset > CONFIG.weeksAhead ? { weekOffset: 0, day: wdOf(today) } : { weekOffset, day: wdOf(date) };
  }
  const defaultDay = () => (CONFIG.openDay === 'today' ? wdOf(new Date()) : 0);
  const weekTotal = SCHEDULE.reduce((n, d) => n + d.length, 0);
  const catCounts = SCHEDULE.flat().reduce((m, x) => { const c = CLASSES[x.c].cat; m[c] = (m[c] || 0) + 1; return m; }, {});
  const dirCount = d => SCHEDULE.flat().filter(x => d.classes.includes(x.c)).length;
  const listedTrainers = Object.entries(TRAINERS).filter(([, t]) => !t.stub);

  /* ================= ХРАНЕНИЕ ЗАПИСЕЙ ================= */
  const STORE_KEY = 'pulse_bookings_v1';

  function loadBookings() {
    let data = {};
    try { data = JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; } catch (e) { data = {}; }
    return prune(data);
  }
  function prune(data) {
    const limit = keyOf(addDays(new Date(), -14));
    const out = {};
    for (const [id, b] of Object.entries(data || {})) {
      if (b && (b.st === 'booked' || b.st === 'wait') && id.slice(0, 10) >= limit) out[id] = b;
    }
    return out;
  }
  function saveBookings() {
    const raw = JSON.stringify(state.bookings);
    try { localStorage.setItem(STORE_KEY, raw); } catch (e) {}
    // в Telegram дополнительно сохраняем в облако — записи видны на всех устройствах пользователя
    if (ver('6.9')) try { tg.CloudStorage.setItem(STORE_KEY, raw, () => {}); } catch (e) {}
  }

  /* ================= СОСТОЯНИЕ ================= */
  const state = {
    screen: 'home',
    weekOffset: 0,
    day: 0,
    filter: 'all',
    trFilter: 'all',
    priceTab: 'cards',
    bookings: loadBookings(),
    animList: true,
    flash: null,
  };
  Object.assign(state, defaultPos());
  const sheetStack = [];

  if (ver('6.9')) {
    try {
      tg.CloudStorage.getItem(STORE_KEY, (err, val) => {
        if (err || !val) return;
        try { state.bookings = prune(JSON.parse(val)); refresh(); } catch (e) {}
      });
    } catch (e) {}
  }

  // записи, которые ещё не прошли
  function myBookings() {
    return Object.entries(state.bookings)
      .map(([id, b]) => { const s = getSlotById(id); return s ? { s, b, inf: slotInfo(s) } : null; })
      .filter(x => x && !x.inf.ended)
      .sort((a, b) => a.s.dateKey.localeCompare(b.s.dateKey) || a.s.start - b.s.start);
  }
  const hasMine = dateKey => Object.keys(state.bookings).some(id => id.startsWith(dateKey + '_'));

  /* ================= ОБЩИЕ КУСОЧКИ ================= */
  const initials = name => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const firstName = tr => tr.name.split(' ')[0];
  const avatar = (tr, size) =>
    `<span class="av av-${size}"><i>${tr ? initials(tr.name) : '?'}</i>${tr && !tr.stub ? `<img src="${thumbOf(tr)}" alt="" loading="lazy">` : ''}</span>`;
  const tag = cat => `<span class="tag">${ic(CATS[cat].icon)}${CATS[cat].name}</span>`;
  const callBtn = (text, cls = 'primary') => `<a class="btn ${cls}" href="#" data-act="demo">${ic('phone')}${text}</a>`;

  function meButton(count) {
    let inner = ic('user');
    if (user && user.photo_url) inner = `<img src="${esc(user.photo_url)}" alt="">`;
    else if (user && user.first_name) inner = esc(user.first_name.trim().charAt(0).toUpperCase());
    return `<button class="me" data-act="tab" data-tab="my" aria-label="Мои записи">${inner}${count ? `<span class="badge">${count}</span>` : ''}</button>`;
  }

  function seatNote(s, inf) {
    if (inf.mine) return { text: 'вы записаны', cls: '' };
    if (inf.wait) return { text: 'вы в листе ожидания', cls: 'low' };
    if (!CONFIG.demoSeats) return { text: 'запись открыта', cls: '' };
    if (inf.full) return { text: 'мест нет', cls: 'off' };
    return inf.free <= 3 ? { text: `осталось ${nSeats(inf.free)}`, cls: 'low' } : { text: `свободно ${nSeats(inf.free)}`, cls: '' };
  }

  // список занятий в шторке; byTrainer — список одного тренера: вместо его имени показываем вид занятия
  const miniList = (slots, byTrainer) => `
    <div class="mini-list">
      ${slots.map(s => `
        <button class="mini" data-act="slot" data-id="${s.id}">
          <span class="mini-d"><small>${DAY_SHORT[s.wd]}</small>${s.date.getDate()}</span>
          <span class="mini-b"><b>${esc(s.title)}</b><small>${fmtMin(s.start)} – ${fmtMin(s.end)} · ${byTrainer ? CATS[s.cat].name : s.trainer ? s.trainer.name : 'тренер уточняется'}</small></span>
          ${slotInfo(s).mine ? `<span class="mini-ok">${ic('check')}</span>` : ic('right')}
        </button>`).join('')}
    </div>`;

  /* ================= ЭКРАН: ГЛАВНАЯ ================= */
  function renderHome() {
    const now = new Date();
    const todayCount = getSlots(now).length;
    const mine = myBookings();
    const next = mine[0];
    const up = nextDay();
    const hour = now.getHours();
    const hello = hour < 5 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
    const name = user && user.first_name ? `, ${esc(user.first_name)}` : '';
    const upTitle = up ? (up.i === 0 ? 'Сегодня' : up.i === 1 ? 'Завтра' : DAY_NAMES[wdOf(up.date)]) : '';
    let i = 0;
    const r = () => `style="--i:${i++}"`;

    return `
      <header class="top rise" ${r()}>
        <div class="brand"><img class="brand-logo" src="${LOGO}" alt="${CONFIG.clubName}"><span class="brand-fallback">${CONFIG.clubName}</span></div>
        ${meButton(mine.length)}
      </header>

      <section class="greet rise" ${r()}>
        <p class="eyebrow">${DAY_NAMES[wdOf(now)]}, ${dateLong(now)}</p>
        <h1>${hello}${name}!</h1>
        <p class="sub">Выберите тренировку и запишитесь в пару касаний</p>
      </section>

      <button class="hero rise" ${r()} data-act="open-schedule">
        <img class="hero-img" src="${simg('group')}" alt="">
        <span class="hero-shade"></span>
        <span class="live"><i></i>${todayCount ? `Сегодня ${nClasses(todayCount)}` : 'Сегодня без групповых занятий'}</span>
        <span class="hero-title">Групповые <em>тренировки</em></span>
        <span class="hero-sub">Йога, пилатес, растяжка, степ, сайкл и функционал</span>
        <span class="hero-stats">
          <span><b>${weekTotal}</b>${plural(weekTotal, 'занятие', 'занятия', 'занятий')}<br>в неделю</span>
          <span><b>${Object.keys(DIRS).length}</b>${plural(Object.keys(DIRS).length, 'направление', 'направления', 'направлений')}<br>в клубе</span>
          <span><b>${listedTrainers.length}</b>${plural(listedTrainers.length, 'тренер', 'тренера', 'тренеров')}<br>в команде</span>
        </span>
        <span class="hero-cta">Открыть расписание<span>${ic('arrow')}</span></span>
      </button>

      ${next ? `
      <button class="next rise" ${r()} data-act="slot" data-id="${next.s.id}">
        <span class="next-date"><b>${next.s.date.getDate()}</b><span>${DAY_SHORT[next.s.wd]}</span></span>
        <span class="next-body">
          <small>${next.b.st === 'wait' ? 'Лист ожидания' : 'Вы записаны'}</small>
          <b>${esc(next.s.title)}</b>
          <span>${fmtMin(next.s.start)} – ${fmtMin(next.s.end)}${next.s.trainer ? ` · ${next.s.trainer.name}` : ''}</span>
        </span>
        ${ic('right')}
      </button>` : ''}

      ${up ? `
      <section class="block rise" ${r()}>
        <div class="block-head"><h2>${upTitle} в клубе</h2><button class="link" data-act="open-schedule">Всё расписание</button></div>
        <div class="hscroll" data-keep="now">
          ${up.list.map(s => {
            const inf = slotInfo(s), note = seatNote(s, inf);
            return `
            <button class="now-card ${inf.mine ? 'mine' : ''}" data-act="slot" data-id="${s.id}">
              <span class="now-top"><b>${fmtMin(s.start)}</b><span>${s.dur} мин</span></span>
              <h3>${esc(s.title)}</h3>
              <span class="now-who">${avatar(s.trainer, 'xs')}<span>${s.trainer ? s.trainer.name : 'Тренер уточняется'}</span></span>
              <span class="now-state ${note.cls}">${note.text}</span>
            </button>`;
          }).join('')}
        </div>
      </section>` : ''}

      <section class="block rise" ${r()}>
        <div class="block-head"><h2>Направления</h2><span class="muted">${Object.keys(DIRS).length} программ</span></div>
        <div class="hscroll" data-keep="dirs">
          ${Object.entries(DIRS).map(([k, d]) => {
            const n = dirCount(d);
            return `
            <button class="dir-card" data-act="dir" data-dir="${k}">
              <img src="${d.img}" alt="" loading="lazy">
              ${n ? `<span class="dir-n">${n} в неделю</span>` : ''}
              <span class="dir-b"><b>${d.name}</b><small>${d.ru}</small></span>
            </button>`;
          }).join('')}
        </div>
      </section>

      <section class="block rise" ${r()}>
        <div class="block-head"><h2>Тренеры</h2><button class="link" data-act="tab" data-tab="trainers">Все ${listedTrainers.length}</button></div>
        <div class="hscroll" data-keep="trs">
          ${HOME_TRAINERS.map(id => {
            const tr = TRAINERS[id];
            return `
            <button class="tr-chip" data-act="trainer" data-tr="${id}">
              ${avatar(tr, 'lg')}
              <b>${firstName(tr)}</b>
              <small>${tr.kind === 'group' ? 'групповые' : tr.kind === 'gym' ? 'тренажёрный' : 'персональный'}</small>
            </button>`;
          }).join('')}
        </div>
      </section>

      <section class="promo rise" ${r()}>
        <small>Первое занятие с тренером</small>
        <b>Бесплатно</b>
        <p>вместо <s>900 ₽</s> — просто попробуйте</p>
        <div class="promo-btns">
          ${callBtn('Позвонить', 'dark')}
          <a class="btn line" href="#" data-act="demo">${ic('send')}Telegram</a>
        </div>
      </section>

      <a class="contact-mini rise" ${r()} href="#" data-act="demo">
        ${ic('pin')}
        <div><b>${CONFIG.address}</b><span>Открыть на карте</span></div>
        ${ic('right')}
      </a>`;
  }

  /* ================= ЭКРАН: РАСПИСАНИЕ ================= */
  function renderSchedule() {
    const ws = weekStart();
    const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    const today = dayStart(new Date()), todayK = keyOf(today);
    const weekLabel = ['Эта неделя', 'Следующая неделя', 'Через неделю'][state.weekOffset] || 'Неделя';
    const chip = (k, name, icon) =>
      `<button class="chip ${state.filter === k ? 'on' : ''}" data-act="filter" data-f="${k}">${icon ? ic(icon) : ''}${name}</button>`;

    return `
      <header class="page-head"><h1>Расписание</h1></header>
      <div class="weekbar">
        <div><span class="eyebrow">${weekLabel}</span><b>${rangeLabel(ws)}</b></div>
        <div class="week-nav">
          <button class="icon-btn" data-act="week-prev" aria-label="Предыдущая неделя" ${state.weekOffset <= 0 ? 'disabled' : ''}>${ic('left')}</button>
          <button class="icon-btn" data-act="week-next" aria-label="Следующая неделя" ${state.weekOffset >= CONFIG.weeksAhead ? 'disabled' : ''}>${ic('right')}</button>
        </div>
      </div>
      <div class="sticky">
        <div class="week">
          ${days.map((d, i) => {
            const k = keyOf(d);
            const cls = [i === state.day && 'on', k === todayK && 'today', CONFIG.lockPast && d < today && 'past'].filter(Boolean).join(' ');
            return `<button class="day ${cls}" data-act="day" data-i="${i}"><span>${DAY_SHORT[i]}</span><b>${d.getDate()}</b><i class="${hasMine(k) ? 'dot' : ''}"></i></button>`;
          }).join('')}
        </div>
        <div class="chips hscroll" data-keep="chips">
          ${chip('all', 'Все')}
          ${Object.entries(CATS).filter(([k]) => catCounts[k]).map(([k, c]) => chip(k, c.name, c.icon)).join('')}
        </div>
      </div>
      ${renderDay(days[state.day])}
      <p class="foot-note">Расписание клуба от ${CONFIG.scheduleFrom}.<br>Изменения уточняйте у администратора: <a href="#" data-act="demo">${CONFIG.phone}</a></p>`;
  }

  function renderDay(date) {
    const all = getSlots(date);
    const list = state.filter === 'all' ? all : all.filter(s => s.cat === state.filter);
    const gaps = state.filter === 'all' ? freeWindows(all) : [];
    const items = [
      ...list.map(s => ({ kind: 'slot', start: s.start, s })),
      ...gaps.map(([a, b]) => ({ kind: 'free', start: a, end: b })),
    ].sort((x, y) => x.start - y.start);

    const sub = [dateLong(date), nClasses(list.length)];
    if (gaps.length) sub.push(`${gaps.length} ${plural(gaps.length, 'окно', 'окна', 'окон')} свободного времени`);
    const isToday = keyOf(date) === keyOf(new Date());
    const head = `
      <div class="day-head">
        <div><h2>${DAY_NAMES[wdOf(date)]}</h2><p>${sub.join(' · ')}</p></div>
        ${isToday ? '<span class="today-pill">сегодня</span>' : ''}
      </div>`;

    if (!list.length) {
      const c = CATS[state.filter];
      return head + `
        <div class="empty">
          <div class="em-ic">${ic(c ? c.icon : 'cal')}</div>
          <b>В этот день нет занятий${c ? ` «${c.name}»` : ''}</b>
          Выберите другой день или посмотрите все направления
          <div><button class="btn ghost sm" data-act="filter" data-f="all">Показать все</button></div>
        </div>`;
    }
    return head + `<div class="timeline ${state.animList ? 'stagger' : ''}">
      ${items.map((it, i) => (it.kind === 'slot' ? slotCard(it.s, i) : freeCard(it, i))).join('')}
    </div>`;
  }

  function bookButton(s, inf) {
    if (inf.mine) return `<button class="btn-book is-mine" data-act="slot" data-id="${s.id}">${ic('check')}Вы записаны</button>`;
    if (inf.wait) return `<button class="btn-book is-wait" data-act="slot" data-id="${s.id}">${ic('bell')}В ожидании</button>`;
    if (inf.ended) return '<span class="state-note">Завершено</span>';
    if (inf.started) return '<span class="state-note">Уже идёт</span>';
    if (inf.full) return `<button class="btn-book is-full" data-act="wait" data-id="${s.id}">Лист ожидания</button>`;
    return `<button class="btn-book" data-act="book" data-id="${s.id}">Записаться</button>`;
  }

  function seatsBlock(s, inf) {
    if (!CONFIG.demoSeats || inf.ended) return '';
    const pct = Math.round((inf.booked / s.cap) * 100);
    const low = !inf.full && !inf.mine && inf.free <= 3;
    const note = inf.full ? 'мест нет' : inf.mine ? 'вы в списке' : `${low ? 'осталось' : 'свободно'} ${nSeats(inf.free)}`;
    return `<div class="seats ${low ? 'low' : ''} ${inf.full ? 'full' : ''}"><div class="bar"><i style="width:${pct}%"></i></div><small>${note}</small></div>`;
  }

  function slotCard(s, i) {
    const inf = slotInfo(s);
    const cls = ['slot', inf.mine && 'mine', inf.full && 'full', inf.ended && 'ended', state.flash === s.id && 'flash'].filter(Boolean).join(' ');
    const who = s.trainer
      ? `<span class="who" data-act="trainer" data-tr="${s.tr}">${avatar(s.trainer, 'xs')}${s.trainer.name}</span>`
      : `<span class="who none">${ic('user')}Тренер уточняется</span>`;
    const seats = seatsBlock(s, inf);
    return `
      <article class="${cls}" style="--i:${i}" data-act="slot" data-id="${s.id}">
        <div class="slot-time"><b>${fmtMin(s.start)}</b><span>${fmtMin(s.end)}</span></div>
        <div class="slot-card">
          <div class="slot-top">${tag(s.cat)}${inf.live ? '<span class="live-tag"><i></i>идёт сейчас</span>' : `<span class="dur">${s.dur} мин</span>`}</div>
          <h3>${esc(s.title)}</h3>
          ${who}
          <div class="slot-foot ${seats ? '' : 'solo'}">${seats}${bookButton(s, inf)}</div>
        </div>
      </article>`;
  }

  function freeCard(it, i) {
    return `
      <div class="free" style="--i:${i}">
        <div class="slot-time"><b>${fmtMin(it.start)}</b><span>${fmtMin(it.end)}</span></div>
        <div class="free-card">
          <span class="free-ic">${ic('sun')}</span>
          <div><b>Свободное время · ${fmtDur(it.end - it.start)}</b><span>Групповых занятий нет — время для тренажёрного зала</span></div>
        </div>
      </div>`;
  }

  /* ================= ЭКРАН: ТРЕНЕРЫ ================= */
  function renderTrainers() {
    const f = state.trFilter;
    const list = f === 'all' ? listedTrainers : listedTrainers.filter(([, t]) => t.kind === f);
    const chip = (k, name) => {
      const n = k === 'all' ? listedTrainers.length : listedTrainers.filter(([, t]) => t.kind === k).length;
      return `<button class="chip ${f === k ? 'on' : ''}" data-act="tr-filter" data-f="${k}">${name}<em>${n}</em></button>`;
    };
    return `
      <header class="page-head">
        <h1>Тренеры</h1>
        <p>Команда профессионалов, которая поможет построить красивое, сильное и здоровое тело</p>
      </header>
      <div class="chips hscroll" data-keep="trchips" style="margin-top:0">
        ${chip('all', 'Все')}${Object.entries(KINDS).map(([k, n]) => chip(k, n)).join('')}
      </div>
      <div class="coach-grid ${state.animList ? 'stagger' : ''}">
        ${list.map(([id, tr], i) => `
          <button class="coach-card" style="--i:${i}" data-act="trainer" data-tr="${id}">
            <img src="${photoOf(tr)}" alt="${tr.name}" loading="lazy">
            ${tr.chip ? `<span class="cc-chip">${tr.chip}</span>` : ''}
            <span class="cc-b"><b>${tr.name}</b><small>${tr.role}</small></span>
          </button>`).join('')}
      </div>`;
  }

  /* ================= ЭКРАН: МОИ ЗАПИСИ ================= */
  function renderMy() {
    const list = myBookings();
    const head = '<header class="page-head"><h1>Мои записи</h1>';
    if (!list.length) {
      return head + `</header>
        <div class="empty">
          <div class="em-ic">${ic('book')}</div>
          <b>Вы пока никуда не записаны</b>
          Выберите тренировку в расписании — запись займёт пару секунд
          <div><button class="btn primary sm" data-act="open-schedule">Открыть расписание</button></div>
        </div>`;
    }
    return head + `<p>${list.length} ${plural(list.length, 'тренировка', 'тренировки', 'тренировок')} в планах</p></header>
      <div class="my-list stagger">
        ${list.map(({ s, b }, i) => `
          <button class="my ${b.st === 'wait' ? 'wait' : ''}" style="--i:${i}" data-act="slot" data-id="${s.id}">
            <span class="my-date"><b>${s.date.getDate()}</b><span>${MONTHS_SHORT[s.date.getMonth()]}</span><small>${DAY_SHORT[s.wd]}</small></span>
            <span class="my-body">
              <span class="st">${b.st === 'wait' ? `${ic('bell')}Лист ожидания` : `${ic('check')}Вы записаны`}</span>
              <h3>${esc(s.title)}</h3>
              <p>${ic('clock')}${fmtMin(s.start)} – ${fmtMin(s.end)}</p>
              ${s.trainer ? `<p>${avatar(s.trainer, 'xs')}${s.trainer.name}</p>` : ''}
            </span>
            ${ic('right')}
          </button>`).join('')}
      </div>
      <p class="foot-note">Отменить запись можно в карточке тренировки.<br>Приходите за 10 минут до начала · ${CONFIG.addressShort}</p>`;
  }

  /* ================= ЭКРАН: КЛУБ ================= */
  function renderClub() {
    const tab = PRICES[state.priceTab];
    const priceRow = ([label, price, old]) =>
      `<div><span>${label}</span><b>${old ? `<s>${old}</s>` : ''}${price}</b></div>`;
    const priceCard = p => {
      const single = p.rows.length === 1 && !p.rows[0][0];
      return `
        <div class="price ${p.best ? 'best' : ''}">
          <div class="price-h"><b>${p.t}</b>${single ? `<b style="color:var(--acc);font-family:var(--display)">${p.rows[0][1]}</b>` : p.s ? `<span>${p.s}</span>` : ''}</div>
          ${single ? '' : `<div class="price-rows">${p.rows.map(priceRow).join('')}</div>`}
        </div>`;
    };
    let i = 0;
    const r = () => `style="--i:${i++}"`;

    return `
      <section class="club-hero rise" ${r()}>
        <img src="img/art/about.svg" alt="">
        <span class="eyebrow">Фитнес-клуб ${CONFIG.clubName}</span>
        <h1>Место, где ты <em>полюбишь спорт</em></h1>
      </section>
      <p class="about rise" ${r()}>Современный клуб для тренировок и поддержания формы. Занятия для женщин и мужчин любого возраста и для детей — неважно, новичок вы или опытный спортсмен.</p>
      <div class="perks rise" ${r()}>
        <span>${ic('pin')}В центре города</span>
        <span>${ic('parking')}Бесплатная парковка</span>
        <span>${ic('spark')}Сауна с услугами клуба</span>
      </div>

      <section class="block rise" ${r()}>
        <div class="block-head"><h2>Всё для тренировок и отдыха</h2></div>
        <div class="svc-grid">
          ${SERVICES.map(s => `
            <${s.act ? 'button' : 'div'} class="svc" ${s.act ? `data-act="${s.act}"` : ''}>
              <img src="${s.img}" alt="" loading="lazy">
              <b>${s.name}</b>
              <small>${s.text || `${Object.keys(DIRS).length} направлений, ${nClasses(weekTotal)} в неделю`}</small>
            </${s.act ? 'button' : 'div'}>`).join('')}
        </div>
      </section>

      <section class="block rise" id="prices" ${r()}>
        <div class="block-head"><h2>Цены</h2></div>
        <div class="seg">
          ${Object.entries(PRICES).map(([k, p]) => `<button class="${state.priceTab === k ? 'on' : ''}" data-act="price-tab" data-f="${k}">${p.name}</button>`).join('')}
        </div>
        <div class="price-list">${tab.items.map(priceCard).join('')}</div>
        <p class="price-note">* Подробности каждого вида услуг уточняйте у администратора</p>
      </section>

      <section class="block rise" ${r()}>
        <div class="block-head"><h2>Программа лояльности</h2></div>
        <div class="hscroll" data-keep="loy">
          ${LOYALTY.map(([pct, title, text]) => `<div class="loy"><b>${pct}</b><h3>${title}</h3><p>${text}</p></div>`).join('')}
        </div>
      </section>

      <section class="block rise" ${r()}>
        <div class="block-head"><h2>Контакты</h2></div>
        <div class="rows">
          <a class="row" href="#" data-act="demo"><span class="row-ic">${ic('pin')}</span><div><small>Адрес</small><b>${CONFIG.address}</b></div>${ic('right')}</a>
          <a class="row" href="#" data-act="demo"><span class="row-ic">${ic('phone')}</span><div><small>Телефон</small><b>${CONFIG.phone}</b></div>${ic('right')}</a>
          <a class="row" href="#" data-act="demo"><span class="row-ic">${ic('send')}</span><div><small>Telegram</small><b>${CONFIG.telegramName}</b></div>${ic('right')}</a>
          <a class="row" href="#" data-act="demo"><span class="row-ic">${ic('globe')}</span><div><small>Сайт</small><b>${CONFIG.siteName}</b></div>${ic('right')}</a>
        </div>
      </section>
      <p class="copy">Демо-версия · клуб ${CONFIG.clubName} вымышленный, все данные примерные</p>`;
  }

  /* ================= ШТОРКА: ТРЕНИРОВКА ================= */
  function slotSheet(s) {
    const inf = slotInfo(s), tr = s.trainer, c = s.cls;
    const dir = c.dir ? DIRS[c.dir] : null;
    const imgDir = DIRS[c.img];
    const cols = s.cap <= 10 ? s.cap : Math.ceil(s.cap / 2);
    const segs = Array.from({ length: s.cap }, (_, i) =>
      `<i class="${i < inf.booked ? 'on' : ''} ${inf.mine && i === inf.booked - 1 ? 'me' : ''}"></i>`).join('');

    const body = `
      <div class="sh-photo">
        <span class="ph-ic">${ic(CATS[s.cat].icon)}</span>
        ${imgDir ? `<img src="${imgDir.img}" alt="">` : ''}
      </div>
      <div class="sh-title">
        <div class="row-tags">${tag(s.cat)}${inf.live ? '<span class="live-tag"><i></i>идёт сейчас</span>' : ''}</div>
        <h2>${esc(s.title)}</h2>
      </div>

      <div class="facts">
        <div class="fact">${ic('cal')}<small>Дата</small><b>${DAY_SHORT[s.wd]}, ${dateLong(s.date)}</b></div>
        <div class="fact">${ic('clock')}<small>Время</small><b>${fmtMin(s.start)} – ${fmtMin(s.end)}</b></div>
        <div class="fact">${ic('timer')}<small>Длительность</small><b>${fmtDur(s.dur)}</b></div>
        <div class="fact">${ic('pin')}<small>Адрес</small><b>${CONFIG.addressShort.replace('пр-т ', '')}</b></div>
      </div>

      ${c.note ? `<p class="sh-text">${c.note}</p>` : ''}
      ${dir ? `<p class="sh-text">${dir.desc}</p>` : ''}

      ${CONFIG.demoSeats ? `
      <div class="sh-block">
        <div class="sh-block-head">
          <h3>Места</h3>
          <span class="${inf.full ? 'muted' : 'acc'}">${inf.full ? 'Мест нет' : `Свободно ${inf.free} из ${s.cap}`}</span>
        </div>
        <div class="segs" style="--cols:${cols}">${segs}</div>
        <small class="hint">Уже ${plural(inf.booked, 'записался', 'записались', 'записались')} ${inf.booked} ${plural(inf.booked, 'человек', 'человека', 'человек')}${inf.mine ? ', включая вас' : ''}</small>
      </div>` : ''}

      <div class="sh-block">
        <div class="sh-block-head"><h3>Тренер</h3></div>
        ${tr ? `
        <button class="coach-row" data-act="trainer" data-tr="${s.tr}">
          ${avatar(tr, 'md')}
          <span class="cb"><b>${tr.name}</b><small>${tr.role}</small></span>
          ${ic('right')}
        </button>` : `<div class="note-box">${ic('info')}<span>Тренер на это занятие уточняется — спросите у администратора.</span></div>`}
      </div>`;

    let foot;
    if (inf.mine) {
      foot = `<div class="sh-foot">
        <div class="booked-note">${ic('check')}<div><b>Вы записаны</b><span>Приходите за 10 минут до начала</span></div></div>
        ${inf.started ? '' : `<button class="btn ghost" data-act="cancel" data-id="${s.id}">Отменить</button>`}
      </div>`;
    } else if (inf.wait) {
      foot = `<div class="sh-foot">
        <div class="booked-note wait">${ic('bell')}<div><b>Вы в листе ожидания</b><span>Если место освободится, оно ваше</span></div></div>
        <button class="btn ghost" data-act="cancel" data-id="${s.id}">Выйти</button>
      </div>`;
    } else if (inf.started) {
      foot = `<div class="sh-foot">
        <div class="booked-note off">${ic('clock')}<div><b>${inf.ended ? 'Занятие завершено' : 'Занятие уже идёт'}</b><span>Запись закрыта — выберите другое время</span></div></div>
      </div>`;
    } else if (inf.full) {
      foot = `<button class="btn ghost" data-act="wait" data-id="${s.id}">${ic('bell')}Встать в лист ожидания</button>`;
    } else {
      foot = `<button class="btn primary" data-act="book" data-id="${s.id}">Записаться · ${DAY_SHORT[s.wd]}, ${fmtMin(s.start)}</button>`;
    }
    return { body, foot };
  }

  /* ================= ШТОРКА: ТРЕНЕР ================= */
  function trainerSheet(id) {
    const tr = TRAINERS[id];
    const slots = upcomingSlots(s => s.tr === id);
    const body = `
      <div class="sh-photo ${tr.stub ? 'low' : 'tall'}">
        <span class="ph-ini">${initials(tr.name)}</span>
        ${tr.stub ? '' : `<img src="${photoOf(tr)}" alt="${tr.name}">`}
      </div>
      <div class="sh-title">
        <span class="role">${tr.role}</span>
        <h2>${tr.name}</h2>
      </div>
      ${tr.stats ? `<div class="tr-stats">${tr.stats.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div>` : ''}
      ${tr.facts ? `<ul class="fact-list">${tr.facts.map(f => `<li>${ic('check')}<span>${f}</span></li>`).join('')}</ul>` : ''}
      ${tr.quote ? `<p class="quote">${tr.quote}</p>` : ''}
      ${tr.tags ? `
      <div class="sh-block">
        <div class="sh-block-head"><h3>${tr.tagsTitle}</h3></div>
        <div class="tags">${tr.tags.map(x => `<span>${x}</span>`).join('')}</div>
      </div>` : ''}
      ${slots.length ? `
      <div class="sh-block">
        <div class="sh-block-head"><h3>Ближайшие занятия</h3><span class="muted">7 дней</span></div>
        ${miniList(slots.slice(0, 10), true)}
      </div>` : tr.kind === 'group' ? `
      <div class="sh-block">
        <div class="note-box">${ic('info')}<span>В ближайшие 7 дней занятий в расписании нет. Уточните у администратора, когда тренер ведёт группы.</span></div>
      </div>` : ''}`;
    const foot = tr.kind === 'group' ? '' :
      `<span class="cta-hint">Персональные тренировки — запись по телефону. Первое занятие бесплатно</span>${callBtn('Позвонить и записаться')}`;
    return { body, foot };
  }

  /* ================= ШТОРКА: НАПРАВЛЕНИЕ ================= */
  function dirSheet(k) {
    const d = DIRS[k];
    const slots = upcomingSlots(s => d.classes.includes(s.key));
    const body = `
      <div class="sh-photo"><span class="ph-ic">${ic('dumbbell')}</span><img src="${d.img}" alt=""></div>
      <div class="sh-title">
        <div class="row-tags"><span class="tag plain">${d.kids ? 'Для детей' : 'Групповая программа'}</span></div>
        <h2>${d.name}</h2>
      </div>
      <p class="sh-text">${d.desc}</p>
      <div class="sh-block">
        ${slots.length ? `
        <div class="sh-block-head"><h3>${d.near ? 'Похожие занятия в расписании' : 'Ближайшие занятия'}</h3><span class="muted">7 дней</span></div>
        ${miniList(slots.slice(0, 8))}` : `
        <div class="note-box">${ic('info')}<span>В текущем расписании этого направления нет. Уточните у администратора, когда набирается группа.</span></div>`}
      </div>`;
    const foot = slots.length
      ? (d.cat ? `<button class="btn ghost" data-act="open-cat" data-f="${d.cat}">${ic('cal')}Все занятия в расписании</button>` : '')
      : callBtn('Позвонить в клуб');
    return { body, foot };
  }

  /* ================= РЕНДЕР ================= */
  const SCREENS = { home: renderHome, schedule: renderSchedule, trainers: renderTrainers, my: renderMy, club: renderClub };
  const TABS = [['home', 'Главная', 'home'], ['schedule', 'Расписание', 'cal'], ['trainers', 'Тренеры', 'users'], ['my', 'Записи', 'book'], ['club', 'Клуб', 'dumbbell']];
  const $ = sel => document.querySelector(sel);
  let firstRender = true;

  function render(anim) {
    const app = $('#app');
    const keep = {};
    app.querySelectorAll('[data-keep]').forEach(n => { keep[n.dataset.keep] = n.scrollLeft; });

    app.innerHTML = `<div class="screen scr-${state.screen} ${anim || firstRender ? 'anim' : ''}">${(SCREENS[state.screen] || renderHome)()}</div>`;

    app.querySelectorAll('[data-keep]').forEach(n => {
      if (!anim && keep[n.dataset.keep] != null) n.scrollLeft = keep[n.dataset.keep];
    });
    if (anim) {
      window.scrollTo(0, 0);
      const on = app.querySelector('.chip.on');
      if (on && on.parentElement) on.parentElement.scrollLeft = Math.max(0, on.offsetLeft - 16);
    }
    firstRender = false;
    state.animList = false;
    state.flash = null;
    renderTabs();
    syncBack();
  }

  function renderTabs() {
    const n = myBookings().length;
    $('#tabbar').innerHTML = `<div class="tabs">${TABS.map(([k, name, icon]) => `
      <button class="tab ${state.screen === k ? 'on' : ''}" data-act="tab" data-tab="${k}">
        <span class="pill">${ic(icon)}</span>${name}${k === 'my' && n ? `<span class="badge">${n}</span>` : ''}
      </button>`).join('')}</div>`;
  }

  function refresh() {
    render();
    if (sheetStack.length) renderSheet({ keepScroll: true });
  }

  function syncBack() {
    if (!hasTgBack) return;
    try {
      if (state.screen !== 'home' || sheetStack.length) tg.BackButton.show();
      else tg.BackButton.hide();
    } catch (e) {}
  }

  function go(screen) {
    if (sheetStack.length) closeSheet();
    if (state.screen === screen) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    state.screen = screen;
    state.animList = true;
    render(true);
  }

  function goBack() {
    if ($('#modal').classList.contains('show')) return;
    if (sheetStack.length) { sheetBack(); return; }
    if (state.screen !== 'home') { haptic.tap(); go('home'); }
  }

  function openSchedule(filter) {
    Object.assign(state, { filter: filter || 'all', animList: true }, defaultPos());
    if (state.screen === 'schedule') { if (sheetStack.length) closeSheet(); render(true); } else go('schedule');
  }

  /* ---------- шторка ---------- */
  function openSheet(kind, id) {
    const top = sheetStack[sheetStack.length - 1];
    if (top && top.kind === kind && top.id === id) return;
    sheetStack.push({ kind, id });
    renderSheet({ swap: sheetStack.length > 1 });
  }

  function renderSheet(opt = {}) {
    const root = $('#sheet-root');
    const top = sheetStack[sheetStack.length - 1];
    if (!top) return;
    let content = null;
    if (top.kind === 'slot') {
      const s = getSlotById(top.id);
      if (s) content = slotSheet(s);
    } else if (top.kind === 'trainer') {
      if (TRAINERS[top.id]) content = trainerSheet(top.id);
    } else if (DIRS[top.id]) {
      content = dirSheet(top.id);
    }
    if (!content) { closeSheet(); return; }

    const wasOpen = root.classList.contains('open');
    const oldScroll = root.querySelector('.sh-scroll');
    const prevTop = opt.keepScroll && oldScroll ? oldScroll.scrollTop : 0;

    root.innerHTML = `
      <div class="sh-back" data-act="sheet-close"></div>
      <div class="sheet" role="dialog" aria-modal="true">
        <div class="sh-grab"><i></i></div>
        <button class="sh-x" data-act="sheet-close" aria-label="Закрыть">${ic('close')}</button>
        <div class="sh-scroll ${opt.swap ? 'swap' : ''}">${content.body}</div>
        ${content.foot ? `<div class="sh-footer">${content.foot}</div>` : ''}
      </div>`;
    root.querySelector('.sh-scroll').scrollTop = prevTop;

    if (!wasOpen) {
      void root.offsetHeight; // чтобы сработала анимация выезда
      root.classList.add('open');
      document.body.classList.add('lock');
    }
    bindDrag(root.querySelector('.sheet'));
    syncBack();
  }

  function sheetBack() {
    sheetStack.pop();
    if (!sheetStack.length) closeSheet();
    else renderSheet({ swap: true });
  }

  function closeSheet() {
    const root = $('#sheet-root');
    sheetStack.length = 0;
    root.classList.remove('open');
    document.body.classList.remove('lock');
    setTimeout(() => { if (!sheetStack.length) root.innerHTML = ''; }, 420);
    syncBack();
  }

  function bindDrag(sheet) {
    const grab = sheet.querySelector('.sh-grab');
    let y0 = null, dy = 0;
    grab.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; dy = 0; sheet.style.transition = 'none'; }, { passive: true });
    grab.addEventListener('touchmove', e => {
      if (y0 == null) return;
      dy = Math.max(0, e.touches[0].clientY - y0);
      sheet.style.transform = `translateY(${dy}px)`;
    }, { passive: true });
    const end = () => {
      if (y0 == null) return;
      y0 = null;
      sheet.style.transition = '';
      sheet.style.transform = '';
      if (dy > 90) closeSheet();
    };
    grab.addEventListener('touchend', end);
    grab.addEventListener('touchcancel', end);
  }

  /* ---------- тост и диалог ---------- */
  let toastTimer;
  function toast(msg, icon = 'check') {
    const el = $('#toast');
    el.innerHTML = `<div class="toast-in">${ic(icon)}<span>${esc(msg)}</span></div>`;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function confirmBox(title, text, okText, cb) {
    if (ver('6.2')) {
      try {
        tg.showPopup({
          title, message: text,
          buttons: [{ id: 'ok', type: 'destructive', text: okText }, { id: 'no', type: 'cancel' }],
        }, id => cb(id === 'ok'));
        return;
      } catch (e) { /* ниже — свой диалог */ }
    }
    const root = $('#modal');
    root.innerHTML = `
      <div class="modal-back" data-m="no"></div>
      <div class="modal" role="alertdialog">
        <h3>${esc(title)}</h3><p>${esc(text)}</p>
        <div class="modal-btns">
          <button class="btn ghost" data-m="no">Назад</button>
          <button class="btn danger" data-m="ok">${esc(okText)}</button>
        </div>
      </div>`;
    root.classList.add('show');
    root.onclick = e => {
      const m = e.target.closest('[data-m]');
      if (!m) return;
      root.classList.remove('show');
      root.onclick = null;
      setTimeout(() => { root.innerHTML = ''; }, 200);
      cb(m.dataset.m === 'ok');
    };
  }

  /* ================= ДЕЙСТВИЯ ================= */
  const when = s => `${DAY_SHORT[s.wd].toLowerCase()}, ${fmtMin(s.start)}`;

  function doBook(id) {
    const s = getSlotById(id);
    if (!s) return;
    const inf = slotInfo(s);
    if (inf.mine || inf.wait) return;
    if (inf.started) { toast('Занятие уже началось — запись закрыта', 'info'); refresh(); return; }
    if (inf.full) { doWait(id); return; }
    state.bookings[id] = { st: 'booked', at: Date.now() };
    saveBookings();
    haptic.ok();
    state.flash = id;
    toast(`Вы записаны: ${s.title} · ${when(s)}`);
    refresh();
  }

  function doWait(id) {
    const s = getSlotById(id);
    if (!s || state.bookings[id] || slotInfo(s).started) return;
    state.bookings[id] = { st: 'wait', at: Date.now() };
    saveBookings();
    haptic.ok();
    toast(`Вы в листе ожидания: ${s.title} · ${when(s)}`, 'bell');
    refresh();
  }

  function doCancel(id) {
    const s = getSlotById(id);
    const b = state.bookings[id];
    if (!s || !b) return;
    const isWait = b.st === 'wait';
    haptic.warn();
    confirmBox(
      isWait ? 'Выйти из листа ожидания?' : 'Отменить запись?',
      `${s.title}, ${DAY_SHORT[s.wd].toLowerCase()} ${dateLong(s.date)} в ${fmtMin(s.start)}`,
      isWait ? 'Выйти' : 'Отменить',
      ok => {
        if (!ok) return;
        delete state.bookings[id];
        saveBookings();
        toast(isWait ? 'Вы вышли из листа ожидания' : 'Запись отменена', 'info');
        refresh();
      });
  }

  // внешние ссылки: в Telegram открываем через его API, в браузере — обычной ссылкой
  function openExt(e, url) {
    if (!inTg) return;
    e.preventDefault();
    try {
      if (/^https:\/\/t\.me\//.test(url) && ver('6.1')) tg.openTelegramLink(url);
      else tg.openLink(url);
    } catch (err) { window.open(url, '_blank', 'noopener'); }
  }

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const d = el.dataset;
    switch (d.act) {
      case 'tab': haptic.tap(); go(d.tab); break;
      case 'open-schedule': haptic.tap(); openSchedule(); break;
      case 'open-cat': haptic.tap(); openSchedule(d.f); break;
      case 'open-trainers': haptic.tap(); state.trFilter = 'personal'; go('trainers'); break;
      case 'open-massage': {
        haptic.tap();
        state.priceTab = 'massage';
        render();
        const p = document.getElementById('prices');
        if (p) p.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
      case 'week-prev':
      case 'week-next': {
        const nextOffset = state.weekOffset + (d.act === 'week-next' ? 1 : -1);
        if (nextOffset < 0 || nextOffset > CONFIG.weeksAhead) break;
        haptic.select();
        Object.assign(state, { weekOffset: nextOffset, day: nextOffset === 0 ? defaultDay() : 0, animList: true });
        render();
        break;
      }
      case 'day':
        if (+d.i === state.day) break;
        haptic.select();
        Object.assign(state, { day: +d.i, animList: true });
        render();
        break;
      case 'filter':
        if (d.f === state.filter) break;
        haptic.select();
        Object.assign(state, { filter: d.f, animList: true });
        render();
        break;
      case 'tr-filter':
        if (d.f === state.trFilter) break;
        haptic.select();
        Object.assign(state, { trFilter: d.f, animList: true });
        render();
        break;
      case 'price-tab':
        if (d.f === state.priceTab) break;
        haptic.select();
        state.priceTab = d.f;
        render();
        break;
      case 'slot': haptic.tap(); openSheet('slot', d.id); break;
      case 'trainer': haptic.tap(); openSheet('trainer', d.tr); break;
      case 'dir': haptic.tap(); openSheet('dir', d.dir); break;
      case 'book': doBook(d.id); break;
      case 'wait': doWait(d.id); break;
      case 'cancel': doCancel(d.id); break;
      case 'sheet-close': closeSheet(); break;
      case 'ext': openExt(e, el.getAttribute('href')); break;
      case 'demo': e.preventDefault(); haptic.tap(); toast('Это демо: клуб и контакты вымышленные', 'info'); break;
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') goBack();
  });

  // статусы «идёт сейчас / завершено» обновляются сами, пока приложение открыто:
  // раз в полминуты смотрим, не началось ли и не закончилось ли какое-то занятие сегодня
  const liveSig = () => keyOf(new Date()) + getSlots(new Date()).map(s => { const f = slotInfo(s); return `${+f.started}${+f.ended}`; }).join('');
  let lastSig = liveSig();
  setInterval(() => {
    if (document.hidden || $('#modal').classList.contains('show')) return;
    const sig = liveSig();
    if (sig !== lastSig) { lastSig = sig; refresh(); }
  }, 30000);

  render();
})();
