/**
 * @Author: sheldon
 * @Date: 2024-06-11 20:28:44
 * @Last Modified by: sheldon
 * @Last Modified time: 2024-06-11 21:00:36
 */

import {useRoutes} from 'react-router-dom';

import {GoogleRecaptcha} from 'src/pages/google-recaptcha';

const routes = [
    {
        path: '/google-recaptcha',
        element: <GoogleRecaptcha />
    },
    {
        path: '*',
        element: <>Hello Goat</>
    }
];

const CustomRoute: React.FC = () => {
    return useRoutes(routes);
};

export default CustomRoute;
