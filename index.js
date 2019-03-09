let scrape = require('./projects/altexch.io');


const project = () =>
    scrape().then(result => {
        if (result) {
            return project()
        }
        else {
            console.log('failed authenticated');
        }
    }).catch(e => {
        console.error(e.message);
        console.error(e.trace);
    });

project();
