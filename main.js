const table_columns = {
    'category': 'Категория',
    'description': "Описание",
    'sum': 'Сумма, грн'
}
const categories = {
    'products': 'Продукты',
    'car': "Машина",
    'cafe': "Рестораны и кафе",
    'fun': 'Развлечения',
    'travel': 'Путешествия',
    'other': 'Другое',
    'materialistic_desires': 'Покупка вещей',
    'subscriptions': 'Подписки',
    'education': 'Образование',
    'gifts': 'Подарки',
    'health': 'Здоровье',
    'tax': 'Налоги',
    'house': 'Дом',
    'deposit': 'Сбережения'
}

const timestamp_for_day = 86400000

// Только тут работа с программой
document.addEventListener('DOMContentLoaded', function () {
    var db;
    var view_table = document.getElementById('view_table')

    init().then(() => {
        initConfigCategorySpends()
    });


    document.addEventListener('click', function (event) {
        if (event.target.name === 'remove') {
            removeSpend(event.target.value)
        }
    })
})

async function updateIncome(event) {
    let transactions = db.transaction('config_spends', "readwrite")
    let s_config_spends = transactions.objectStore('config_spends')
    let new_income = {
        'name': 'config_income',
        'amount': parseInt(event.target.value)
    }

    calculateAmountConfigRemaining().then((result) => {
        document.getElementById('config_remains').textContent = result
    })

    s_config_spends.put(new_income)
}

async function initConfigCategorySpends() {
    let transactions = db.transaction('config_spends', "readwrite")
    let s_config_spends = transactions.objectStore('config_spends')

    let config_spends = document.getElementById('config_spends')

    let income_from_db = await s_config_spends.get('config_income')

    if (income_from_db === undefined) {
        s_config_spends.add({
            'name': 'config_income',
            'amount': 0
        })
        income_from_db = await s_config_spends.get('config_income')
    }

    let top_list = document.createElement('li')
    let label = document.createElement('label')
    label.setAttribute('for', 'config_income')
    label.textContent = 'Доход : '
    top_list.appendChild(label)
    let input_income = document.createElement('input')
    input_income.id = 'config_income'
    input_income.style.width = '50px'
    input_income.setAttribute('onchange', "updateIncome(event)")
    input_income.value = income_from_db.amount
    top_list.appendChild(input_income)
    config_spends.appendChild(top_list)

    config_spends.appendChild(document.createElement('hr'))

    let h3 = document.createElement('h3')
    h3.style.textAlign = 'center'
    h3.textContent = 'Траты по категориям'
    config_spends.appendChild(h3)

    for (let index in categories) {
        let current_config_value = await s_config_spends.get('config_' + index)
        if (current_config_value === undefined) {
            s_config_spends.add({
                'name': 'config_' + index,
                'amount': 0,
                'coefficient': 0
            })
        }

        let list = document.createElement('li')
        let label = document.createElement('label')
        label.setAttribute('for', 'config_' + index)
        label.textContent = categories[index]
        list.appendChild(label)

        let sinput = document.createElement('input')
        sinput.id = 'config_' + index
        sinput.style.width = '50px'
        sinput.setAttribute('onchange', 'updatePlannedSumsFromConfig(event)')
        sinput.setAttribute('autocomplete', 'off')
        sinput.value = current_config_value.amount

        list.appendChild(sinput)

        let coefficient = document.createElement('input')
        coefficient.id = 'config_coefficient_' + index
        coefficient.style.width = "15px"
        coefficient.setAttribute('onchange', 'updatePlannedCoefficientFromConfig(event)')

        coefficient.value = current_config_value.coefficient
        list.appendChild(coefficient)

        config_spends.appendChild(list)
    }

    config_spends.appendChild(document.createElement('hr'))

    let bot_h3 = document.createElement('h3')
    bot_h3.style.textAlign = 'center'
    bot_h3.textContent = 'Остаток = '
    let ultra_useful_label = document.createElement('span')
    ultra_useful_label.id = 'config_remains'
    calculateAmountConfigRemaining().then((result) => {
        ultra_useful_label.textContent = result
    })
    bot_h3.appendChild(ultra_useful_label)
    config_spends.appendChild(bot_h3)
}

async function calculateAmountConfigRemaining() {
    let transactions = db.transaction('config_spends', "readwrite")
    let s_config_spends = transactions.objectStore('config_spends')
    let income = await s_config_spends.get('config_income')

    let spend = 0
    for (let index in categories) {
        let middleware = await s_config_spends.get('config_' + index)
        spend += middleware.amount
    }
    return (income.amount - spend)
}

async function updatePlannedCoefficientFromConfig(event) {
    let update_value = event.target.value
    let target_id = event.target.id.split('_coefficient_').join('_')
    let transactions = db.transaction('config_spends', "readwrite")
    let config_spends = transactions.objectStore('config_spends')
    let last_result = await config_spends.get(target_id)
    let prepared_item = {
        'name': target_id,
        'amount': last_result.amount,
        'coefficient': parseInt(update_value)
    }
    let request = config_spends.put(prepared_item)

    updateFinanceHelperData()
}

async function updatePlannedSumsFromConfig(event) {
    let update_value = event.target.value === '' ? event.target.value = 0 : event.target.value
    let target_id = event.target.id
    let transactions = db.transaction('config_spends', "readwrite")
    let config_spends = transactions.objectStore('config_spends')
    let last_result = await config_spends.get(target_id)
    let prepared_item = {
        'name': target_id,
        'amount': parseInt(update_value),
        'coefficient': last_result.coefficient
    }

    let request = config_spends.put(prepared_item)
    request.onsuccess = () => {
        console.dir('ura')
    }
    request.onerror = () => {
        console.error(request.error)
    }

    calculateAmountConfigRemaining().then((result) => {
        document.getElementById('config_remains').textContent = result
    })

    updateFinanceHelperData()
}

async function updateFinanceHelperData() {
    let helper_table = document.getElementById('help_table').getElementsByTagName('table')[0]
    let title_row = helper_table.getElementsByTagName('tr')[0]
    title_row.style.backgroundColor = '#e9d8a6'
    helper_table.innerText = ''
    helper_table.appendChild(title_row)

    for (let index in categories) {
        let row = document.createElement('tr')
        let td = document.createElement('td')
        td.textContent = categories[index]
        row.appendChild(td)
        let left_amount = document.createElement('td')
        left_amount.textContent = await getLeftAmountByTitle(index)

        // На следующую покупку
        let amount_to_next_buy = document.createElement('td')
        amount_to_next_buy.textContent = (await getAmountToNextBuyByTitle('config_' + index, parseInt(left_amount.textContent))).toString()
        amount_to_next_buy.style.width = '75px'
        row.appendChild(amount_to_next_buy)

        // Дней до покупки
        let days_to_next_buy = document.createElement('td')
        days_to_next_buy.textContent = (
            await getDaysToNextBuy(
                await getPlannedCoefficientByTitle('config_' + index)
            )
        ).toString()
        if (days_to_next_buy.textContent === '0') {
            days_to_next_buy.textContent = 'Today!'
        } else if (days_to_next_buy.textContent === '1') {
            days_to_next_buy.textContent += ' Day'
        } else if (days_to_next_buy.textContent !== 'Once') {
            days_to_next_buy.textContent += ' Days'
        }
        days_to_next_buy.style.width = '80px'
        row.appendChild(days_to_next_buy)

        // Осталось на месяц
        row.appendChild(left_amount)

        // Эталон
        let etalon = document.createElement('td')
        etalon.textContent = (await calculateEtalon('config_' + index)).toString()
        row.appendChild(etalon)

        if (days_to_next_buy.textContent === 'Once') {
            setBackGroundByComparing(parseInt(left_amount.textContent), 0, row)
        } else {
            setBackGroundByComparing(parseInt(amount_to_next_buy.textContent), parseInt(etalon.textContent), row)
        }

        helper_table.appendChild(row)
    }
}

function setBackGroundByComparing(value, right, row) {
    if (value > right) {
        row.style.backgroundColor = '#0a9396'
    } else if (value < right) {
        row.style.backgroundColor = '#ae2012'
    } else {
        row.style.backgroundColor = '#ee9b00'
    }
}

async function getLeftAmountByTitle(index) {
    let spends_config_transaction = db.transaction('config_spends', "readonly")
    let spends_config = spends_config_transaction.objectStore('config_spends')
    let all_from_spends_config = await spends_config.getAll()

    let transaction = db.transaction('spends', "readonly")
    let spends = transaction.objectStore('spends')
    let CategoryIndex = spends.index('category_index')

    let result = await CategoryIndex.getAll(index)

    let total_spend = 0
    for (let cat_index in result) {
        let single_spend = result[cat_index]
        total_spend += parseInt(single_spend.sum)
    }

    let planned_amount = 0
    all_from_spends_config.find(function (element) {
        if (element.name === 'config_' + index) {
            planned_amount = element.amount
        }
    });

    return planned_amount - total_spend
}

async function getAmountToNextBuyByTitle(title, left_in_month) {
    let days_left = await getDaysLeftInWholePeriod()
    let planed_coefficient = await getPlannedCoefficientByTitle(title)
    let periods_count = planed_coefficient === 0 ? 1 : Math.floor(days_left / planed_coefficient)
    let etalon_left_in_month =
        await getPlannedAmountByTitle(title) - ((await calculatePeriodsCountByTitle(title) - periods_count) * await calculateEtalon(title))
    let difference_with_etalon = etalon_left_in_month - left_in_month
    let response = Math.round(left_in_month / periods_count)
    if (difference_with_etalon > 0 && planed_coefficient !== 0) response -= difference_with_etalon
    return response

}

async function getDaysLeftInWholePeriod() {
    let finishDate = await getFinishTimeStamp()
    let today = new Date().getTime()
    let days_to_finish = (finishDate - today) / timestamp_for_day
    return Math.floor(days_to_finish)
}

async function getDaysToNextBuy(coefficient) {
    let startDate = await getStartTimeStamp()
    let today = new Date().getTime()
    let days_from_start = (today - startDate) / timestamp_for_day
    if (coefficient === 0) return 'Once'
    return (coefficient - (Math.round(days_from_start % coefficient)))
}

async function getPlannedAmountByTitle(title) {
    let transaction = db.transaction('config_spends', "readonly")
    let spends_config = transaction.objectStore('config_spends')
    return (await spends_config.get(title)).amount
}

async function getPlannedCoefficientByTitle(title) {
    let transaction = db.transaction('config_spends', "readonly")
    let spends_config = transaction.objectStore('config_spends')
    return (await spends_config.get(title)).coefficient
}

async function calculateEtalon(title) {
    let planed_sum = await getPlannedAmountByTitle(title)
    let periods_count = await calculatePeriodsCountByTitle(title)
    return Math.round(planed_sum / periods_count)

}

async function calculatePeriodsCountByTitle(title) {
    let days_in_period = await getDaysInCurrentPeriod()
    let planed_coefficient = await getPlannedCoefficientByTitle(title)
    let periods_count
    if (planed_coefficient === 0) {
        periods_count = 1
    } else {
        periods_count = Math.floor(days_in_period / planed_coefficient)
    }
    return periods_count
}

async function saveMonthStartDate() {
    let overall_config_transaction = db.transaction('overall_config', "readwrite")
    let overall_config = overall_config_transaction.objectStore('overall_config')

    let now = new Date()
    let start_date = calculateFirstThursdayDay(now, true)
    let finish_date = calculateFirstThursdayDay(new Date(now.getFullYear(), now.getMonth() + 1, 1), true)
    let data = {
        'start': start_date,
        'finish': finish_date
    }
    await overall_config.clear()
    await overall_config.put(data, start_date)
}

async function getStartTimeStamp() {
    let overall_config_transaction = db.transaction('overall_config', 'readonly')
    let overall_config = overall_config_transaction.objectStore('overall_config')
    let data = (await overall_config.getAll())[0]
    return data.start
}

async function getFinishTimeStamp() {
    let overall_config_transaction = db.transaction('overall_config', 'readonly')
    let overall_config = overall_config_transaction.objectStore('overall_config')
    let data = (await overall_config.getAll())[0]
    return data.finish
}

async function getDaysInCurrentPeriod() {
    let overall_config_transaction = db.transaction('overall_config', 'readonly')
    let overall_config = overall_config_transaction.objectStore('overall_config')
    let data = (await overall_config.getAll())[0]

    return (data.finish - data.start) / timestamp_for_day
}

function calculateNextMonthCompensationsPeriod(current_date) {
    let end = new Date(current_date.getFullYear(), current_date.getMonth() + 1, 0).getDate()
    let left = end - calculateFirstThursdayDay(current_date)
    let response = new Date(current_date.getFullYear(), current_date.getMonth() + 1, 1);
    console.dir(left + calculateFirstThursdayDay(response))

}

function calculateFirstThursdayDay(date, to_ts = false) {
    let first_day_of_month = new Date(date.getFullYear(), date.getMonth(), 1)
    let current_day = first_day_of_month.getDay()
    let day_to = 5 - current_day
    if (day_to < 0) day_to = Math.abs(day_to) + 5
    day_to += 5

    if (to_ts) {
        return (new Date(date.getFullYear(), date.getMonth(), day_to)).getTime()
    }
    return day_to
}

async function init() {
    db = await idb.openDb('finance', 8, db => {
        if (!db.objectStoreNames.contains('spends')) {
            db.createObjectStore('spends', {keyPath: 'id', autoIncrement: true});
        }

        if (!db.objectStoreNames.contains('config_spends')) {
            db.createObjectStore('config_spends', {keyPath: 'name'});
        }

        if (!db.objectStoreNames.contains('overall_config')) {
            db.createObjectStore('overall_config', {keyPath: 'start'});
        }

        if (!db.transaction.objectStore('spends').indexNames.contains('category_index')) {
            let spends = db.transaction.objectStore('spends');
            let index = spends.createIndex('category_index', 'category');
            console.dir(index)
        }
    });

    await update();
}

function initForm() {
    let categories_select = document.createElement("select")
    categories_select.setAttribute('form', "add_new_finance_note")
    categories_select.name = "category"
    categories_select.id = "category"
    for (let index in categories) {
        let option = document.createElement('option')
        option.setAttribute('value', index)
        option.innerText = categories[index]
        categories_select.appendChild(option)
    }

    let form = document.createElement('form')
    form.setAttribute('name', "add_new_finance_note")
    form.id = 'add_new_finance_note'

    for (let index in table_columns) {
        let label = document.createElement('label')
        label.setAttribute('for', 'category')
        label.textContent = table_columns[index] + ' : '
        form.appendChild(label)
        if (index === 'category') {
            categories_select.style.width = ''
            form.appendChild(categories_select)
            continue
        }
        let input = document.createElement('input')
        input.setAttribute('name', index)
        input.id = index
        input.type = 'text'
        form.appendChild(input)
    }

    let submit = document.createElement('input')
    submit.type = 'submit'
    submit.value = '+'
    form.appendChild(submit)

    let table = document.getElementById('view_table').getElementsByTagName('table')[0]
    let tr = document.createElement('tr')
    let td = document.createElement('td')
    td.colSpan = 4
    td.appendChild(form)
    tr.appendChild(td)
    table.appendChild(tr)

    form = document.getElementById('add_new_finance_note')
    form.addEventListener('submit', function (event) {
        event.preventDefault();
        addSpends(form)
    })
}

function addSpends(form) {
    let formdata = new FormData(form)
    let transactions = db.transaction('spends', "readwrite")
    let spends = transactions.objectStore('spends')

    if (formdata.get('sum') != parseFloat(formdata.get('sum'))) {
        let target = document.getElementById('sum')
        target.value = '';
        target.style.border = "1px solid red"
        return
    }

    let new_spend = {
        'sum': formdata.get('sum'),
        'description': formdata.get('description'),
        'category': formdata.get('category')
    }
    try {
        spends.add(new_spend)
    } catch (err) {
        throw err
    }

    update()
}

function removeSpend(index) {
    let transactions = db.transaction('spends', "readwrite")
    let spends = transactions.objectStore('spends')
    index = parseInt(index)

    console.dir(index)
    let results = spends.delete(index)
    results.onsuccess = function () {
        console.dir(results.result)
    }
    results.onerror = function () {
        console.dir(results.error)
    }

    update()
}

// Обновить, по сути отрисовать с нуля таблицу
async function update() {
    let transaction = db.transaction('spends')
    let spends = transaction.objectStore('spends');

    let result = await spends.getAllKeys()

    let table = view_table.getElementsByTagName("table")[0]
    table.innerText = ''
    initForm()

    for (let index in table_columns) {
        let th = document.createElement('th')
        th.innerText = table_columns[index]
        table.appendChild(th)
    }

    let th = document.createElement('th')
    th.innerText = 'Удалить'
    table.appendChild(th)

    let row = document.createElement("tr");
    if (!result.length) {
        let td = document.createElement("td")
        td.colSpan = 4
        td.textContent = 'Нет данных'
        td.style.textAlign = 'center'
        row.appendChild(td)
        table.appendChild(row)
        return;
    }


    await result.forEach(async (item) => {
        let single_spend = await spends.get(item)
        //console.dir(single_spend)

        let row = document.createElement("tr");

        let category_cell = document.createElement("td");
        category_cell.textContent = single_spend.category
        row.appendChild(category_cell);

        let description_cell = document.createElement("td");
        description_cell.textContent = single_spend.description
        row.appendChild(description_cell)

        let sum_cell = document.createElement("td");
        sum_cell.textContent = single_spend.sum
        row.appendChild(sum_cell)

        let remove_cell = document.createElement("td")
        remove_cell.textContent = 'x'
        remove_cell.style.textAlign = 'center'
        remove_cell.value = item
        remove_cell.name = 'remove'
        remove_cell.classList.add('removeSpendCell')

        row.appendChild(remove_cell)

        table.appendChild(row);
    }, updateFinanceHelperData())
}


