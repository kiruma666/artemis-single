/* eslint-disable no-console */
import nodemailer, {SendMailOptions} from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: 'smtp.163.com',
    port: 465,
    secure: true,
    auth: {
        user: 'multitransfer2022@163.com',
        pass: 'YTJVEPYQLTHSBERF', //密码：Multitransfer22

    }
});

const receivers = [
    'sheldon@quoll.finance'
];

const mailOptions = {
    from: 'multitransfer2022@163.com',
    to: receivers,
    subject: '',
    text: ''
};

export const sendMail = function(customOptions: Partial<SendMailOptions>) {
    transporter.sendMail({
        ...mailOptions,
        ...customOptions
    }, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
};
