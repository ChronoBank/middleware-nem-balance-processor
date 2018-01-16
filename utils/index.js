/**
 * NEM utils set
 *
 * @module Chronobank/utils
 *
 */

const _ = require('lodash'),
  Promise = require('bluebird'),
  nis = require('../services/nisRequestService');

const flattenMosaics = mosObj =>
  _.transform(mosObj, (acc, m) => acc[`${m.mosaicId.namespaceId}:${m.mosaicId.name}`] = m.quantity, {});

const intersectByMosaic = (m1, m2) =>
  _.intersection(_.keys(flattenMosaics(m1)), _.keys(flattenMosaics(m2)));

const convertBalanceWithDivisibility = (balance) => {

  let confirmed = _.get(balance, 'confirmed', 0);
  let unconfirmed = _.get(balance, 'unconfirmed', 0);
  let vested = _.get(balance, 'vested', 0);

  return {
    confirmed: {
      value: confirmed,
      amount: `${(confirmed / 1000000).toFixed(6)}`
    },
    unconfirmed: {
      value: unconfirmed,
      amount: `${(unconfirmed / 1000000).toFixed(6)}`
    },
    vested: {
      value: vested,
      amount: `${(vested / 1000000).toFixed(6)}`
    }
  };
};

const convertMosaicsWithDivisibility = async (mosaics) => {
  mosaics = _.chain(mosaics)
    .toPairs()
    .map(pair => {
      let definition = pair[0].split(':');
      return {
        name: definition[1],
        namespaceId: definition[0],
        quantity: pair[1]
      };
    })
    .value();

  mosaics = await Promise.map(mosaics, async mosaic => {

    let definition = await nis.getMosaicsDefinition(mosaic.namespaceId);

    mosaic.value = mosaic.quantity / _.chain(definition)
      .get('data')
      .find({mosaic: {id: {name: mosaic.name}}})
      .get('mosaic.properties')
      .find({name: 'divisibility'})
      .get('value', 1)
      .thru(val => Math.pow(10, val))
      .value();

    return mosaic;
  });

  return _.transform(mosaics, (acc, item) => {
    acc[`${item.namespaceId}:${item.name}`] = {
      amount: item.value,
      value: item.quantity
    };
  }, {});
};


module.exports = {
  flattenMosaics,
  intersectByMosaic,
  convertBalanceWithDivisibility,
  convertMosaicsWithDivisibility
};
