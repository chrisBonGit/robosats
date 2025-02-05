import React, { useEffect, useState } from 'react';
import { HashRouter, BrowserRouter, Switch, Route, useHistory } from 'react-router-dom';
import { useTheme, Box, Slide, Typography } from '@mui/material';

import UserGenPage from './UserGenPage';
import MakerPage from './MakerPage';
import BookPage from './BookPage';
import OrderPage from './OrderPage';
import SettingsPage from './SettingsPage';
import NavBar, { Page } from './NavBar';
import MainDialogs, { OpenDialogs } from './MainDialogs';

import RobotAvatar from '../components/RobotAvatar';
import {
  Book,
  LimitList,
  Maker,
  Robot,
  Info,
  Settings,
  Favorites,
  defaultMaker,
  defaultInfo,
  Coordinator,
} from '../models';

import { apiClient } from '../services/api';
import { checkVer, getHost } from '../utils';
import { sha256 } from 'js-sha256';

import defaultCoordinators from '../../static/federation.json';
import { useTranslation } from 'react-i18next';

const getWindowSize = function (fontSize: number) {
  // returns window size in EM units
  return {
    width: window.innerWidth / fontSize,
    height: window.innerHeight / fontSize,
  };
};

interface SlideDirection {
  in: 'left' | 'right' | undefined;
  out: 'left' | 'right' | undefined;
}

interface MainProps {
  settings: Settings;
  setSettings: (state: Settings) => void;
}

const Main = ({ settings, setSettings }: MainProps): JSX.Element => {
  const { t } = useTranslation();

  // All app data structured
  const [book, setBook] = useState<Book>({ orders: [], loading: true });
  const [limits, setLimits] = useState<{ list: LimitList; loading: boolean }>({
    list: [],
    loading: true,
  });
  const [robot, setRobot] = useState<Robot>(new Robot());
  const [maker, setMaker] = useState<Maker>(defaultMaker);
  const [info, setInfo] = useState<Info>(defaultInfo);
  const [coordinators, setCoordinators] = useState<Coordinator[]>(defaultCoordinators);
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [fav, setFav] = useState<Favorites>({ type: null, currency: 0 });

  const theme = useTheme();
  const history = useHistory();

  const Router = window.NativeRobosats === undefined ? BrowserRouter : HashRouter;
  const basename = window.NativeRobosats === undefined ? '' : window.location.pathname;
  const entryPage: Page | '' =
    window.NativeRobosats === undefined ? window.location.pathname.split('/')[1] : '';
  const [page, setPage] = useState<Page>(entryPage == '' ? 'robot' : entryPage);
  const [slideDirection, setSlideDirection] = useState<SlideDirection>({
    in: undefined,
    out: undefined,
  });
  const [currentOrder, setCurrentOrder] = useState<number | null>(null);

  const navbarHeight = 2.5;
  const closeAll = {
    more: false,
    learn: false,
    community: false,
    info: false,
    coordinator: false,
    stats: false,
    update: false,
    profile: false,
  };
  const [open, setOpen] = useState<OpenDialogs>(closeAll);

  const [windowSize, setWindowSize] = useState<{ width: number; height: number }>(
    getWindowSize(theme.typography.fontSize),
  );

  useEffect(() => {
    if (typeof window !== undefined) {
      window.addEventListener('resize', onResize);
    }
    fetchBook();
    fetchLimits();
    return () => {
      if (typeof window !== undefined) {
        window.removeEventListener('resize', onResize);
      }
    };
  }, [baseUrl]);

  useEffect(() => {
    let host = '';
    if (window.NativeRobosats === undefined) {
      host = getHost();
    } else {
      host =
        settings.network === 'mainnet'
          ? coordinators[0].mainnetOnion
          : coordinators[0].testnetOnion;
    }
    setBaseUrl(`http://${host}`);
  }, [settings.network]);

  useEffect(() => {
    setWindowSize(getWindowSize(theme.typography.fontSize));
  }, [theme.typography.fontSize]);

  const onResize = function () {
    setWindowSize(getWindowSize(theme.typography.fontSize));
  };

  const fetchBook = function () {
    setBook({ ...book, loading: true });
    apiClient.get(baseUrl, '/api/book/').then((data: any) =>
      setBook({
        loading: false,
        orders: data.not_found ? [] : data,
      }),
    );
  };

  const fetchLimits = async () => {
    setLimits({ ...limits, loading: true });
    const data = apiClient.get(baseUrl, '/api/limits/').then((data) => {
      setLimits({ list: data ?? [], loading: false });
      return data;
    });
    return await data;
  };

  const fetchInfo = function () {
    setInfo({ ...info, loading: true });
    apiClient.get(baseUrl, '/api/info/').then((data: Info) => {
      const versionInfo: any = checkVer(data.version.major, data.version.minor, data.version.patch);
      setInfo({
        ...data,
        openUpdateClient: versionInfo.updateAvailable,
        coordinatorVersion: versionInfo.coordinatorVersion,
        clientVersion: versionInfo.clientVersion,
        loading: false,
      });
    });
  };

  useEffect(() => {
    if (
      open.stats ||
      open.coordinator ||
      info.version == { major: null, minor: null, patch: null }
    ) {
      fetchInfo();
    }
  }, [open.stats, open.coordinator]);

  const fetchRobot = function ({ keys = false }) {
    const requestBody = {
      token_sha256: sha256(robot.token),
    };
    if (keys) {
      requestBody.pub_key = robot.pubKey;
      requestBody.enc_priv_key = robot.encPrivKey;
    }

    setRobot({ ...robot, loading: true });
    apiClient.post(baseUrl, '/api/user/', requestBody).then((data: any) => {
      setCurrentOrder(
        data.active_order_id
          ? data.active_order_id
          : data.last_order_id
          ? data.last_order_id
          : null,
      );
      setRobot({
        ...robot,
        nickname: data.nickname,
        token: robot.token,
        loading: false,
        avatarLoaded: robot.nickname === data.nickname ? true : false,
        activeOrderId: data.active_order_id ? data.active_order_id : null,
        lastOrderId: data.last_order_id ? data.last_order_id : null,
        referralCode: data.referral_code,
        earnedRewards: data.earned_rewards ?? 0,
        stealthInvoices: data.wants_stealth,
        tgEnabled: data.tg_enabled,
        tgBotName: data.tg_bot_name,
        tgToken: data.tg_token,
        bitsEntropy: data.token_bits_entropy,
        shannonEntropy: data.token_shannon_entropy,
        pubKey: data.public_key,
        encPrivKey: data.encrypted_private_key,
        copiedToken: data.found ? true : robot.copiedToken,
      });
    });
  };

  useEffect(() => {
    if (baseUrl != '') {
      if (open.profile || (robot.token && robot.nickname === null)) {
        fetchRobot({ keys: false }); // fetch existing robot
      } else if (robot.token && robot.encPrivKey && robot.pubKey) {
        fetchRobot({ keys: true }); // create new robot with existing token and keys (on network and coordinator change)
      }
    }
  }, [open.profile, baseUrl]);

  return (
    <Router basename={basename}>
      {/* load robot avatar image, set avatarLoaded: true */}
      <RobotAvatar
        style={{ display: 'none' }}
        nickname={robot.nickname}
        baseUrl={baseUrl}
        onLoad={() => setRobot({ ...robot, avatarLoaded: true })}
      />
      {settings.network === 'testnet' ? (
        <div style={{ height: 0 }}>
          <Typography color='secondary' align='center'>
            <i>{t('Using Testnet Bitcoin')}</i>
          </Typography>
        </div>
      ) : (
        <></>
      )}

      <Box
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) translate(0,  -${navbarHeight / 2}em`,
        }}
      >
        <Switch>
          <Route
            path={['/robot/:refCode?', '/']}
            exact
            render={(props: any) => (
              <Slide
                direction={page === 'robot' ? slideDirection.in : slideDirection.out}
                in={page === 'robot'}
                appear={slideDirection.in != undefined}
              >
                <div>
                  <UserGenPage
                    setPage={setPage}
                    setCurrentOrder={setCurrentOrder}
                    match={props.match}
                    theme={theme}
                    robot={robot}
                    setRobot={setRobot}
                    baseUrl={baseUrl}
                  />
                </div>
              </Slide>
            )}
          />

          <Route path={'/offers'}>
            <Slide
              direction={page === 'offers' ? slideDirection.in : slideDirection.out}
              in={page === 'offers'}
              appear={slideDirection.in != undefined}
            >
              <div>
                <BookPage
                  book={book}
                  fetchBook={fetchBook}
                  limits={limits}
                  fetchLimits={fetchLimits}
                  fav={fav}
                  setFav={setFav}
                  maker={maker}
                  setMaker={setMaker}
                  lastDayPremium={info.last_day_nonkyc_btc_premium}
                  windowSize={windowSize}
                  hasRobot={robot.avatarLoaded}
                  setPage={setPage}
                  setCurrentOrder={setCurrentOrder}
                  baseUrl={baseUrl}
                />
              </div>
            </Slide>
          </Route>

          <Route path='/create'>
            <Slide
              direction={page === 'create' ? slideDirection.in : slideDirection.out}
              in={page === 'create'}
              appear={slideDirection.in != undefined}
            >
              <div>
                <MakerPage
                  book={book}
                  limits={limits}
                  fetchLimits={fetchLimits}
                  maker={maker}
                  setMaker={setMaker}
                  setPage={setPage}
                  setCurrentOrder={setCurrentOrder}
                  fav={fav}
                  setFav={setFav}
                  windowSize={{ ...windowSize, height: windowSize.height - navbarHeight }}
                  hasRobot={robot.avatarLoaded}
                  baseUrl={baseUrl}
                />
              </div>
            </Slide>
          </Route>

          <Route
            path='/order/:orderId'
            render={(props: any) => (
              <Slide
                direction={page === 'order' ? slideDirection.in : slideDirection.out}
                in={page === 'order'}
                appear={slideDirection.in != undefined}
              >
                <div>
                  <OrderPage
                    theme={theme}
                    history={history}
                    {...props}
                    setPage={setPage}
                    baseUrl={baseUrl}
                  />
                </div>
              </Slide>
            )}
          />

          <Route path='/settings'>
            <Slide
              direction={page === 'settings' ? slideDirection.in : slideDirection.out}
              in={page === 'settings'}
              appear={slideDirection.in != undefined}
            >
              <div>
                <SettingsPage
                  settings={settings}
                  setSettings={setSettings}
                  windowSize={{ ...windowSize, height: windowSize.height - navbarHeight }}
                />
              </div>
            </Slide>
          </Route>
        </Switch>
      </Box>
      <NavBar
        nickname={robot.avatarLoaded ? robot.nickname : null}
        color={settings.network === 'mainnet' ? 'primary' : 'secondary'}
        width={windowSize.width}
        height={navbarHeight}
        page={page}
        setPage={setPage}
        open={open}
        setOpen={setOpen}
        closeAll={closeAll}
        setSlideDirection={setSlideDirection}
        currentOrder={currentOrder}
        hasRobot={robot.avatarLoaded}
        baseUrl={baseUrl}
      />
      <MainDialogs
        open={open}
        setOpen={setOpen}
        setRobot={setRobot}
        setPage={setPage}
        setCurrentOrder={setCurrentOrder}
        info={info}
        robot={robot}
        closeAll={closeAll}
        baseUrl={baseUrl}
      />
    </Router>
  );
};

export default Main;
