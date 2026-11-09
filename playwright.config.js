const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
 testDir:'./tests', reporter:'list', timeout:30000,
 use:{baseURL:process.env.BASE_URL||'https://lonniebeal-droid.github.io/ju-jessie-public/',browserName:'chromium',headless:true},
});
