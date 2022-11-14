import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab, Tabs, Paper, CircularProgress, Grid, Typography, Box } from '@mui/material';

import TradeBox from '../../components/TradeBox';
import OrderDetails from '../../components/OrderDetails';
import { useHistory } from 'react-router-dom';

import { apiClient } from '../../services/api';

import { Page } from '../NavBar';
import { Order } from '../../models';

// Refresh delays (ms) according to Order status
const statusToDelay = [
  3000, // 'Waiting for maker bond'
  35000, // 'Public'
  180000, // 'Paused'
  3000, // 'Waiting for taker bond'
  999999, // 'Cancelled'
  999999, // 'Expired'
  8000, // 'Waiting for trade collateral and buyer invoice'
  8000, // 'Waiting only for seller trade collateral'
  8000, // 'Waiting only for buyer invoice'
  10000, // 'Sending fiat - In chatroom'
  10000, // 'Fiat sent - In chatroom'
  100000, // 'In dispute'
  999999, // 'Collaboratively cancelled'
  10000, // 'Sending satoshis to buyer'
  999999, // 'Sucessful trade'
  30000, // 'Failed lightning network routing'
  300000, // 'Wait for dispute resolution'
  300000, // 'Maker lost dispute'
  300000, // 'Taker lost dispute'
];

interface OrderPageProps {
  windowSize: { width: number; height: number };
  hasRobot: boolean;
  setPage: (state: Page) => void;
  setCurrentOrder: (state: number) => void;
  baseUrl: string;
  currentOrder: number | undefined;
  locationOrder: number;
}

const OrderPage = ({
  windowSize,
  setPage,
  setCurrentOrder,
  hasRobot = false,
  baseUrl,
  currentOrder,
  locationOrder,
}: OrderPageProps): JSX.Element => {
  const { t } = useTranslation();
  const history = useHistory();

  const [order, setOrder] = useState<Order | undefined>(undefined);
  const [badRequest, setBadRequest] = useState<string | undefined>(undefined);
  const [delay, setDelay] = useState<number>(60000);
  const [timer, setTimer] = useState<NodeJS.Timer>(setInterval(() => null, delay));
  const [tab, setTab] = useState<'order' | 'contract'>('contract');

  const doublePageWidth: number = 50;
  const maxHeight: number = windowSize.height * 0.85 - 3;
  const orderId = locationOrder ?? currentOrder;

  useEffect(() => {
    fetchOrder(orderId);
    setTimer(setInterval(() => fetchOrder(orderId), delay));
  }, []);

  useEffect(() => {
    clearInterval(timer);
    setTimer(setInterval(() => fetchOrder(orderId), delay));

    return () => clearInterval(timer);
  }, [delay]);

  const orderReceived = function (data: any) {
    if (data.bad_request != undefined) {
      setBadRequest(data.bad_request);
      setOrder(undefined);
    } else {
      setDelay(data.status >= 0 && data.status <= 18 ? statusToDelay[data.status] : 99999999);
      setOrder(data);
      setBadRequest(undefined);
    }
  };

  const fetchOrder = function (id: number) {
    apiClient.get(baseUrl, '/api/order/?order_id=' + id).then(orderReceived);
  };

  const renewOrder = function () {
    if (order != undefined) {
      const body = {
        type: order.type,
        currency: order.currency,
        amount: order.has_range ? null : order.amount,
        has_range: order.has_range,
        min_amount: order.min_amount,
        max_amount: order.max_amount,
        payment_method: order.payment_method,
        is_explicit: order.is_explicit,
        premium: order.is_explicit ? null : order.premium,
        satoshis: order.is_explicit ? order.satoshis : null,
        public_duration: order.public_duration,
        escrow_duration: order.escrow_duration,
        bond_size: order.bond_size,
        bondless_taker: order.bondless_taker,
      };
      apiClient.post(baseUrl, '/api/make/', body).then((data: any) => {
        if (data.bad_request) {
          setBadRequest(data.bad_request);
        } else if (data.id) {
          history.push('/order/' + data.id);
          fetchOrder(data.id);
          setCurrentOrder(data.id);
        }
      });
    }
  };

  return (
    <Box>
      {order == undefined && badRequest == undefined ? <CircularProgress /> : <></>}
      {badRequest != undefined ? (
        <Typography align='center' variant='subtitle2' color='secondary'>
          {t(badRequest)}
        </Typography>
      ) : (
        <></>
      )}
      {order != undefined && badRequest == undefined ? (
        order.is_participant ? (
          windowSize.width > doublePageWidth ? (
            // DOUBLE PAPER VIEW
            <Grid
              container
              direction='row'
              justifyContent='center'
              alignItems='flex-start'
              spacing={2}
              style={{ width: '43em' }}
            >
              <Grid item xs={6} style={{ width: '21em' }}>
                <Paper
                  elevation={12}
                  style={{
                    width: '21em',
                    maxHeight: `${maxHeight}em`,
                    overflow: 'auto',
                  }}
                >
                  <OrderDetails
                    order={order}
                    setOrder={setOrder}
                    baseUrl={baseUrl}
                    setPage={setPage}
                    hasRobot={hasRobot}
                  />
                </Paper>
              </Grid>
              <Grid item xs={6} style={{ width: '21em' }}>
                <Paper
                  elevation={12}
                  style={{
                    width: '21em',
                    maxHeight: `${maxHeight}em`,
                    overflow: 'auto',
                  }}
                >
                  <TradeBox
                    order={order}
                    setOrder={setOrder}
                    setBadRequest={setBadRequest}
                    baseUrl={baseUrl}
                    onRenewOrder={renewOrder}
                  />
                </Paper>
              </Grid>
            </Grid>
          ) : (
            // SINGLE PAPER VIEW
            <Box>
              <Box sx={{ borderBottom: 1, borderColor: 'divider', width: '21em' }}>
                <Tabs
                  value={tab}
                  onChange={(mouseEvent, value) => setTab(value)}
                  variant='fullWidth'
                >
                  <Tab label={t('Order')} value='order' />
                  <Tab label={t('Contract')} value='contract' />
                </Tabs>
              </Box>
              <Paper
                elevation={12}
                style={{
                  width: '21em',
                  maxHeight: `${maxHeight}em`,
                  overflow: 'auto',
                }}
              >
                <div style={{ display: tab == 'order' ? '' : 'none' }}>
                  <OrderDetails
                    order={order}
                    setOrder={setOrder}
                    baseUrl={baseUrl}
                    setPage={setPage}
                    hasRobot={hasRobot}
                  />
                </div>
                <div style={{ display: tab == 'contract' ? '' : 'none' }}>
                  <TradeBox
                    order={order}
                    setOrder={setOrder}
                    setBadRequest={setBadRequest}
                    baseUrl={baseUrl}
                    onRenewOrder={renewOrder}
                  />
                </div>
              </Paper>
            </Box>
          )
        ) : (
          <OrderDetails
            order={order}
            setOrder={setOrder}
            baseUrl={baseUrl}
            setPage={setPage}
            hasRobot={hasRobot}
          />
        )
      ) : (
        <></>
      )}
    </Box>
  );
};

export default OrderPage;
