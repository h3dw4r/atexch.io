const TempMail = require('temp-mail')
const puppeteer = require('puppeteer')
const referalLink = 'http://altexch.io?ref=94948'

const tmpMail = new TempMail;
const nodeText = node => node.innerHTML.toLowerCase();
const delay = ms => new Promise(rs => setTimeout(rs, ms));

const pass = 'Password_123321';

/**
 * 1. https://altexch.io/?ref=94948
 * 2. $('#email').val('pasat@1blackmoon.com').next(':submit').click()
 * 3. $('h2').text().toLowerCase() == 'registration'
 *    $('h4').text().toLowerCase() == "we have sent you email verification link.check your email inbox/spam folder and follow the link."
 * 4. check email, get actiovation link `Account verification link`
 * 5. http://altexch.io/register.php?uemail=pasat@1blackmoon.com&code=460543
 * 6. $('#uname').val($('#uemail').val().split('@')[0])
 *    $('#upass, #cpass').val('Password_123321');
 *    $('button:submit').click()
 * 7. $('a:contains(Logout)').length == 2
 */

/**
 *
 * @param {array} inbox
 * @returns {object} {from,subject,hash}
 */
const findVerificationMail = inbox => inbox.filter(mail => mail.subject.indexOf('verification') != -1)[0];

let scrape = async () => {
    await tmpMail.getAvailableDomains();

    const browser = await puppeteer.launch({headless: true});
    let page = await browser.newPage();

    // 1
    await page.goto(referalLink);
    await delay(1000);

    let name = tmpMail.getRandomName();
    let domain = tmpMail.getRandomDomain();
    let email = name + domain;
    let $ = await tmpMail.change(email);

    if (email == $('#mail').val()) {
        let alert = $('div.alert').find('button').remove().end().text().trim();
        console.log(alert);
    }

    // 2
    await page.type('#email', email, {delay: 50});
    await page.click('#email+input[type=submit]');
    await page.waitForSelector('h4');

    let h2 = await page.$('h2');
    let h4 = await page.$('h4');

    let title = await page.evaluate(nodeText, h2);
    let message = await page.evaluate(nodeText, h4);

    console.log(message.trim());

    // h2 registration
    // h2 login
    if (title != 'registration') {
        browser.close();
        return;
    }
    // message:
    // already
    // verification

    let mail = null;

    for (let i = 0; i < 10; i++) {
        let inbox = await tmpMail.refresh();
        mail = findVerificationMail(inbox);

        if (mail) {
            console.log('find email', mail.from, mail.subject, mail.hash);
            break;
        }
        else {
            console.log('wait email', inbox);
            await delay(3000);
        }
    }

    if (!mail) {
        console.error('mail not found');

        browser.close();
        return false;
    }

    //4 check email and get activation link
    let mailText = await tmpMail.view(mail.hash);
    let activationLink = mailText.find('a').attr('href');

    console.log('activation link:', activationLink);

    if (!activationLink) {
        console.error('activationLink not found');
        browser.close();
        return false;
    }

    // 5 goto activation link
    page = await browser.newPage();
    await page.goto(activationLink);
    await page.waitForSelector('#uname');
    await delay(1000);
    await page.type('#uname', name, {delay: 50});
    await page.type('#upass', pass, {delay: 50});
    await page.type('#cpass', pass, {delay: 50});
    await page.click('button');

    await delay(1000);
    await page.waitForSelector('nav a');

    const isAuthenticated = await page.$$eval('nav a', anchors => anchors.filter(a => a.innerHTML.indexOf('Logout') != -1).length);

    console.log(isAuthenticated ? '+' : '-', 'referer', email); // Получилось!

    browser.close();

    console.log('###');
    return isAuthenticated;
};


module.exports = scrape;
