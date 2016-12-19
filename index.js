'use strict'

// stdlib
const os = require('os')
// npm
const ip = require('ip')
const ping = require('ping')
const program = require('commander')
const ProgressBar = require('progress')
const Promise = require('bluebird')
// local
const pkg = require('./package.json')
const iputils = require('./ip-utils')

const BASE_TIMEOUT = 250 / 1000
const BASE_CONCURRENCY = 50

const cidrList = []
const timeouts = {}

/**
 * Parsing functions
 */
function shuffle (a) {
  let j, x, i
  for (i = a.length; i; i--) {
    j = Math.floor(Math.random() * i)
    x = a[i - 1]
    a[i - 1] = a[j]
    a[j] = x
  }
}

function pingHost (host, timeout) {
  return ping.promise.probe(host, {
    number: 1,
    numeric: true,
    timeout: timeout || BASE_TIMEOUT,
  })
}

function printResponse (outcome) {
  const { host } = outcome

  if (outcome.alive) {
    console.log(`Reply from ${host}: time=${outcome.time || 1}ms`)
    return Promise.resolve()
  } else if (timeouts[host] == null) {
    timeouts[host] = true
    return pingHost(host, BASE_TIMEOUT * 2).then(printResponse)
  }
}

function scan (hosts) {
  return Promise.map(hosts, host => pingHost(host).then(printResponse), { concurrency: BASE_CONCURRENCY })
}

/**
 * buildHostList uses the cidr(s) in input and builds a list of host(s) to ping
 * @return {array} host array
 */
function buildHostList () {
  let list = []
  if (cidrList.length === 0) return discoverCIDR()

  const cidrArray = cidrList
  for (let i = 0; i < cidrArray.length; i++) {
    let subnet
    try {
      subnet = ip.cidrSubnet(cidrArray[i])
    } catch (err) {
      console.error('Invalid CIDR provided:', cidrArray[i])
      process.exit(1)
    }
    list = list.concat(iputils.ipArray(subnet.firstAddress, subnet.lastAddress))
  }

  return list
}

/**
 * discoverCIDR discovers networks from OS and builds a list of host(s) to ping
 * @return {array} host array
 */
function discoverCIDR () {
  const interfaces = os.networkInterfaces()
  let list = []

  for (const key in interfaces) {
    const ipv4 = interfaces[key].filter(iface => iface.internal === false && iface.family === 'IPv4')
    if (ipv4[0] == null) continue
    const subnet = ip.subnet(ipv4[0].address, ipv4[0].netmask)
    list = list.concat(iputils.ipArray(subnet.firstAddress, subnet.lastAddress))
  }
  return list
}

/**
 * Logic starts here
 */
program.version(pkg.version)

program.command('pscan [cidr] [otherCidr...]')
// .option('-c --concurrency <n>', 'PING execution concurrency', 2)
.action((cidr, otherCidr) => {
  if (cidr != null) cidrList.push(cidr)
  if (otherCidr.length > 0) otherCidr.forEach(c => cidrList.push(c))
})

program.parse(process.argv)

const hosts = buildHostList()
// in case multiple CIDR are specified, ping command(s) will be shuffled across netmasks
// if (cidrList.length > 0) shuffle(hosts)

scan(hosts)
