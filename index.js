'use strict'

// stdlib
const os = require('os')
// npm
const ip = require('ip')
const ping = require('net-ping')
const program = require('commander')
const Promise = require('bluebird')
// local
const pkg = require('./package.json')
const iputils = require('./ip-utils')

const BASE_TIMEOUT = 500
const BASE_CONCURRENCY = 1000
const session = ping.createSession({ packetSize: 64, timeout: BASE_TIMEOUT, retries: 1 })

const { RequestTimedOutError } = ping

const cidrList = []
/**
 * Wrap callback-style pingHost
 */
function pingHost (host) {
  return new Promise((resolve, reject) => {
    session.pingHost(host, (err, target, sent, rcvd) => {
      if (err) return reject(err)

      return resolve({ target, roundtrip: (rcvd - sent) })
    })
  })
}

function scan (hosts) {
  const options = { concurrency: BASE_CONCURRENCY }

  const timedOut = () => Promise.resolve() // suppress timeout errors
  const eachHost = (host) => {
    return pingHost(host)
      .then(outcome => console.log(`Reply from ${host}: time=${outcome.roundtrip || 1}ms`))
      // .catch(RequestTimedOutError, () => console.log(`Dead ${host}`))
      .catch(RequestTimedOutError, timedOut)
  }

  return Promise.map(hosts, eachHost, options)
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

program.command('pingscan [cidr] [otherCidr...]')
// .option('-c --concurrency <n>', 'PING execution concurrency', 2)
.action((cidr, otherCidr) => {
  if (cidr != null) cidrList.push(cidr)
  if (otherCidr.length > 0) otherCidr.forEach(c => cidrList.push(c))
})

program.parse(process.argv)

const hosts = buildHostList()
scan(hosts)
