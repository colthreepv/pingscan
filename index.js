'use strict'

// stdlib
const os = require('os')
// npm
const ip = require('ip')
const ping = require('ping')
const program = require('commander')
const Promise = require('bluebird')
// local
const pkg = require('./package.json')
const iputils = require('./ip-utils')

const BASE_TIMEOUT = 250 / 1000
const BASE_CONCURRENCY = 50

const cidrList = []
/**
 * Parsing functions
 */
function pingHost (host, timeout) {
  return ping.promise.probe(host, {
    number: 1,
    numeric: true,
    timeout: timeout || BASE_TIMEOUT,
  })
}

function printResponse (outcome) {
  if (!outcome.alive) return
  console.log(`Reply from ${outcome.host}: time=${outcome.time || 1}ms`)
}

function scan (hosts) {
  const retries = []
  const pingAndPrint = host => pingHost(host).then(printResponse)
  const options = { concurrency: BASE_CONCURRENCY }

  const checkFailure = (outcome) => {
    if (outcome.alive) printResponse(outcome)
    else retries.push(outcome.host)
  }

  return Promise
    .map(hosts, host => pingHost(host).then(checkFailure), options)
    .then(() => {
      console.log('Retrying failed hosts')
      return Promise.map(retries, pingAndPrint, options)
    })
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
  const list = []

  for (const key in interfaces) {
    const ipv4 = interfaces[key].filter(iface => iface.internal === false && iface.family === 'IPv4')
    if (ipv4[0] == null) continue
    const subnet = ip.subnet(ipv4[0].address, ipv4[0].netmask)
    iputils.ipArray(subnet.firstAddress, subnet.lastAddress).forEach(ip => list.push(ip))
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
scan(hosts)
